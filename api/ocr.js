// Vercel serverless function — menu-board OCR via Google Gemini (Gemma) vision.
// Uses the SAME GEMINI_API_KEY as api/gemini.js (this key's free tier only covers
// Gemma models), so no separate Cloud Vision key is needed. The key lives ONLY in
// the environment variable; it never reaches the client bundle. Returns 503 (not an
// error) when unset, so the client falls back to browser-side Tesseract.

import { blockRequest } from "./_guard.js";

const MODEL = "gemma-4-26b-a4b-it";

// Lean prompt: this model has no API-level thinking toggle (thinkingBudget is
// rejected), so we suppress reasoning in the prompt AND ask for dish names only.
// Skipping prices/shop-name roughly halves the output tokens → ~2x faster. Prices
// fall back to each dish's typical range in the menu DB, so nothing breaks.
const PROMPT = [
  "You are OCR for a Korean food / 분식 menu board.",
  "Output ONLY a JSON array. No thinking, no explanation, no markdown fences.",
  "Include ONLY Korean dish-name words. IGNORE prices, numbers, phone numbers, and the shop name.",
  'Each element: { "text": <korean dish name>, "box_2d": [ymin, xmin, ymax, xmax] }',
  "with box_2d as integers normalized 0-1000 relative to the image.",
].join("\n");

export default async function handler(req, res) {
  if (blockRequest(req, res)) return;

  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    // Not configured — a normal state; the client uses its Tesseract fallback.
    res.status(503).json({ error: "GEMINI_API_KEY is not configured" });
    return;
  }

  const image = req.body?.image;
  if (typeof image !== "string" || image.length === 0) {
    res.status(400).json({ error: "Body must be JSON: { image: <base64>, width, height }" });
    return;
  }
  // Image pixel size — needed to turn Gemini's 0-1000 boxes into pixel coordinates.
  const width = Number(req.body?.width) || 1000;
  const height = Number(req.body?.height) || 1000;

  // Strip a data: URL prefix if the client happened to send one.
  const b64 = image.startsWith("data:") ? image.slice(image.indexOf(",") + 1) : image;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`;
    const gRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { inline_data: { mime_type: "image/jpeg", data: b64 } },
              { text: PROMPT },
            ],
          },
        ],
        generationConfig: { temperature: 0, responseMimeType: "application/json" },
      }),
    });

    if (!gRes.ok) {
      const detail = await gRes.text();
      res.status(502).json({ error: `Gemini OCR ${gRes.status}`, detail });
      return;
    }

    const data = await gRes.json();
    // Gemma 4 emits intermediate "thought" parts alongside the answer — keep only real text.
    const parts = data.candidates?.[0]?.content?.parts ?? [];
    const text =
      parts
        .filter((p) => p && p.thought !== true && typeof p.text === "string")
        .map((p) => p.text)
        .join("") || "[]";

    const tokens = parseTokens(text, width, height);
    res.status(200).json({ tokens });
  } catch (err) {
    res.status(502).json({ error: "Gemini OCR request failed", detail: String(err) });
  }
}

// Parse the model's JSON array and convert box_2d ([ymin,xmin,ymax,xmax], 0-1000)
// into the client's pixel bbox shape [x, y, w, h].
function parseTokens(text, width, height) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return [];
  }
  const arr = Array.isArray(parsed) ? parsed : parsed?.tokens;
  if (!Array.isArray(arr)) return [];

  const tokens = [];
  for (const el of arr) {
    if (!el || typeof el.text !== "string") continue;
    const b = el.box_2d;
    if (!Array.isArray(b) || b.length < 4) continue;
    const [ymin, xmin, ymax, xmax] = b.map(Number);
    if ([ymin, xmin, ymax, xmax].some((n) => Number.isNaN(n))) continue;

    const x = (Math.min(xmin, xmax) / 1000) * width;
    const y = (Math.min(ymin, ymax) / 1000) * height;
    const w = (Math.abs(xmax - xmin) / 1000) * width;
    const h = (Math.abs(ymax - ymin) / 1000) * height;

    const t = el.text.trim();
    if (t) tokens.push({ text: t, bbox: [x, y, Math.max(1, w), Math.max(1, h)] });
  }
  return tokens;
}
