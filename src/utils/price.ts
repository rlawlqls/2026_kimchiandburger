import type { Bbox, OcrToken } from "../types";

const PRICE_RE = /^([0-9][0-9.,]*)원?$/;

/**
 * Simple heuristic (§5-3): the first numeric token on the same row
 * (y-center within ±50% of the menu bbox height) to the RIGHT of the
 * menu name is treated as its price. Fails harmlessly → null.
 */
export function findPriceForBbox(menuBbox: Bbox, tokens: OcrToken[]): string | null {
  const [mx, my, mw, mh] = menuBbox;
  const menuCy = my + mh / 2;
  const menuRight = mx + mw;

  let best: { x: number; value: number } | null = null;
  for (const t of tokens) {
    const raw = t.text.trim();
    const m = raw.match(PRICE_RE);
    if (!m) continue;
    const digits = m[1].replace(/[.,]/g, "");
    if (!/^\d+$/.test(digits)) continue;
    let value = parseInt(digits, 10);
    if (Number.isNaN(value)) continue;
    // menu boards often abbreviate: "3,000" but also "3.0" or "3500"
    if (value < 100) value *= 1000; // "3" / "3.5" style shorthand
    if (value < 100 || value > 100000) continue;

    const [x, y, , h] = t.bbox;
    const cy = y + h / 2;
    if (Math.abs(cy - menuCy) > mh * 0.5) continue; // not the same row
    if (x < menuRight) continue; // must be to the right
    if (!best || x < best.x) best = { x, value };
  }

  return best ? `₩${best.value.toLocaleString("en-US")}` : null;
}
