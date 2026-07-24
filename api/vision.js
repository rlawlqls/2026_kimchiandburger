// Vercel serverless function — menu-board OCR via Google Cloud Vision.
// This is the PRIMARY OCR path: a purpose-built OCR engine, so it returns real
// pixel bounding boxes (not an LLM's estimate) in ~0.5s instead of several
// seconds. Uses GCP_VISION_KEY; like api/ocr.js the key lives ONLY in the
// environment and never reaches the client bundle. Returns 503 (not an error)
// when unset, so the client falls back to api/ocr.js and then Tesseract.

import { blockRequest } from "./_guard.js";

const ENDPOINT = "https://vision.googleapis.com/v1/images:annotate";

export default async function handler(req, res) {
  if (blockRequest(req, res)) return;

  const key = process.env.GCP_VISION_KEY;
  if (!key) {
    // Not configured — a normal state; the client falls through to /api/ocr.
    res.status(503).json({ error: "GCP_VISION_KEY is not configured" });
    return;
  }

  const image = req.body?.image;
  if (typeof image !== "string" || image.length === 0) {
    res.status(400).json({ error: "Body must be JSON: { image: <base64> }" });
    return;
  }

  // Strip a data: URL prefix if the client happened to send one.
  const b64 = image.startsWith("data:") ? image.slice(image.indexOf(",") + 1) : image;

  try {
    const gRes = await fetch(`${ENDPOINT}?key=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [
          {
            image: { content: b64 },
            // DOCUMENT_TEXT_DETECTION beats TEXT_DETECTION on dense, multi-column
            // boards and on the decorative/handwritten fonts menu signs like to use.
            features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
            imageContext: { languageHints: ["ko"] },
          },
        ],
      }),
    });

    if (!gRes.ok) {
      const detail = await gRes.text();
      res.status(502).json({ error: `Cloud Vision ${gRes.status}`, detail });
      return;
    }

    const data = await gRes.json();
    const first = data.responses?.[0];
    if (first?.error) {
      res.status(502).json({ error: "Cloud Vision returned an error", detail: first.error.message });
      return;
    }

    res.status(200).json({ tokens: extractTokens(first) });
  } catch (err) {
    res.status(502).json({ error: "Cloud Vision request failed", detail: String(err) });
  }
}

/**
 * Flatten fullTextAnnotation into the client's token shape.
 *
 * Three layers of candidates, appended in order of decreasing precision so that
 * detectMenuItems' first-match-wins dedupe always prefers the tightest box:
 *
 *   1) WORD tokens — Vision's own word boxes. Precise; also what utils/price.ts
 *      needs, since it finds a dish's price by looking for a separate numeric
 *      token on the same row, so prices must stay as their own tokens.
 *   2) MERGED PAIRS — a spaced name ("돼지 국밥") arrives as two words that
 *      neither half matches; adjacent same-row pairs are merged as extra recall.
 *   3) ROW tokens — see reconstructRows(). Some Korean menu boards spread a
 *      dish's characters across the whole board width ("김 ........ 밥") with a
 *      vertical side label, and Vision then groups characters the WRONG way
 *      (stacking "김"+"떡" vertically). Word/pair merging can't fix that, so we
 *      rebuild rows from raw SYMBOL boxes clustered by y. This is what recovers
 *      spread-out names like 김밥 / 라면 / 잡채 on such boards.
 */
function extractTokens(response) {
  const pages = response?.fullTextAnnotation?.pages ?? [];
  const tokens = [];
  const symbols = [];

  for (const page of pages) {
    for (const block of page.blocks ?? []) {
      for (const para of block.paragraphs ?? []) {
        const words = [];
        for (const word of para.words ?? []) {
          const text = (word.symbols ?? []).map((s) => s.text ?? "").join("").trim();
          const bbox = verticesToBbox(word.boundingBox?.vertices);
          if (!text || !bbox) continue;
          words.push({ text, bbox });
          // Collect every symbol for the row pass below.
          for (const s of word.symbols ?? []) {
            const sBox = verticesToBbox(s.boundingBox?.vertices);
            const sText = (s.text ?? "").trim();
            if (sText && sBox) symbols.push({ text: sText, bbox: sBox });
          }
        }
        tokens.push(...words);
        tokens.push(...mergedPairs(words));
      }
    }
  }

  tokens.push(...reconstructRows(symbols));
  return tokens;
}

/**
 * Rebuild each visual row from individual symbols, bypassing Vision's word
 * grouping. Symbols are clustered by vertical center; within a row they are
 * sorted left→right, overlapping duplicates (Vision emits overlapping words, so
 * a symbol can appear 2-3×) are dropped, and only Hangul is kept. The resulting
 * "row string" (e.g. "분떡볶이") matches via matchMenu's containment step.
 *
 * The bbox spans only the Hangul symbols, NOT the trailing price digits, so
 * price.ts still finds the price as a separate token to the right.
 */
function reconstructRows(symbols) {
  if (symbols.length < 2) return [];

  const heights = symbols.map((s) => s.bbox[3]).sort((a, b) => a - b);
  const medH = heights[Math.floor(heights.length / 2)] || 1;
  const cy = (s) => s.bbox[1] + s.bbox[3] / 2;

  const rows = [];
  for (const s of [...symbols].sort((a, b) => cy(a) - cy(b))) {
    const row = rows.find((R) => Math.abs(R.cy - cy(s)) < medH * 0.6);
    if (row) {
      row.items.push(s);
      row.cy = (row.cy * (row.items.length - 1) + cy(s)) / row.items.length;
    } else {
      rows.push({ cy: cy(s), items: [s] });
    }
  }

  const out = [];
  for (const row of rows) {
    row.items.sort((a, b) => a.bbox[0] - b.bbox[0]);
    // Drop overlapping duplicates of the same character (same text, boxes stacked).
    const deduped = [];
    for (const s of row.items) {
      const last = deduped[deduped.length - 1];
      if (last && last.text === s.text && s.bbox[0] - last.bbox[0] < last.bbox[2] * 0.6) continue;
      deduped.push(s);
    }
    const hangul = deduped.filter((s) => /[가-힣]/.test(s.text));
    if (hangul.length < 2) continue;

    const text = hangul.map((s) => s.text).join("");
    const x = Math.min(...hangul.map((s) => s.bbox[0]));
    const y = Math.min(...hangul.map((s) => s.bbox[1]));
    const right = Math.max(...hangul.map((s) => s.bbox[0] + s.bbox[2]));
    const bottom = Math.max(...hangul.map((s) => s.bbox[1] + s.bbox[3]));
    out.push({ text, bbox: [x, y, right - x, bottom - y] });
  }
  return out;
}

/** Adjacent same-row word pairs, merged into one token spanning both boxes. */
function mergedPairs(words) {
  const pairs = [];
  for (let i = 0; i + 1 < words.length; i++) {
    const a = words[i];
    const b = words[i + 1];
    const [ax, ay, aw, ah] = a.bbox;
    const [bx, by, bw, bh] = b.bbox;

    // Same row, and b sits to the right of a within roughly one character's gap.
    const aCy = ay + ah / 2;
    const bCy = by + bh / 2;
    if (Math.abs(aCy - bCy) > ah * 0.5) continue;
    const gap = bx - (ax + aw);
    if (gap < 0 || gap > ah * 1.5) continue;

    const x = Math.min(ax, bx);
    const y = Math.min(ay, by);
    pairs.push({
      text: `${a.text}${b.text}`,
      bbox: [x, y, Math.max(ax + aw, bx + bw) - x, Math.max(ay + ah, by + bh) - y],
    });
  }
  return pairs;
}

/** Vision gives 4 corner vertices; the client wants [x, y, w, h] in pixels. */
function verticesToBbox(vertices) {
  if (!Array.isArray(vertices) || vertices.length === 0) return null;
  const xs = vertices.map((v) => Number(v?.x) || 0);
  const ys = vertices.map((v) => Number(v?.y) || 0);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  const w = Math.max(...xs) - x;
  const h = Math.max(...ys) - y;
  if (w <= 0 || h <= 0) return null;
  return [x, y, w, h];
}
