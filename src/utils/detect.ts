import type { DetectedItem, OcrResult } from "../types";
import { matchMenu } from "./match";
import { normalizeBbox } from "./normalize";
import { findPriceForBbox } from "./price";

/**
 * Pipeline step [3]+[2]: fuzzy-match every OCR token against MENU_DB,
 * attach the same-row price, and normalize coordinates to 0~1.
 * Unmatched tokens (prices, shop names…) are silently dropped.
 */
export function detectMenuItems(ocr: OcrResult): DetectedItem[] {
  const seen = new Set<string>();
  const detected: DetectedItem[] = [];

  for (const token of ocr.tokens) {
    const menu = matchMenu(token.text);
    if (!menu) continue;
    if (seen.has(menu.id)) continue; // first (top-most) occurrence wins
    seen.add(menu.id);

    detected.push({
      menu,
      bbox: normalizeBbox(token.bbox, ocr.imageWidth, ocr.imageHeight),
      ocrPrice: findPriceForBbox(token.bbox, ocr.tokens),
      sourceText: token.text,
    });
  }

  return detected;
}
