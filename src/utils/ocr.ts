import type { OcrResult, OcrToken } from "../types";

/**
 * Single OCR interface with automatic failover (§3-2):
 *   1) Gemma vision via the /api/ocr Vercel function (key stays server-side)
 *   2) Tesseract.js (kor) fully client-side — no API key needed
 * Both paths return the same shape: [{ text, bbox: [x, y, w, h] }] in pixels.
 */
export async function runOcr(
  imageBase64: string,
  imageWidth: number,
  imageHeight: number,
): Promise<OcrResult> {
  try {
    const tokens = await cloudOcr(imageBase64, imageWidth, imageHeight);
    return { tokens, engine: "gemma", imageWidth, imageHeight };
  } catch (err) {
    console.warn("Cloud OCR unavailable, falling back to Tesseract:", err);
    const tokens = await tesseractOcr(imageBase64);
    return { tokens, engine: "tesseract", imageWidth, imageHeight };
  }
}

async function cloudOcr(
  imageBase64: string,
  imageWidth: number,
  imageHeight: number,
): Promise<OcrToken[]> {
  const controller = new AbortController();
  // Gemma vision can take a while (it "thinks" before answering); fall back after 30s.
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const res = await fetch("/api/ocr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: imageBase64, width: imageWidth, height: imageHeight }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`/api/ocr responded ${res.status}`);
    const data = (await res.json()) as { tokens?: OcrToken[] };
    if (!Array.isArray(data.tokens)) throw new Error("Malformed /api/ocr response");
    return data.tokens;
  } finally {
    clearTimeout(timer);
  }
}

async function tesseractOcr(imageBase64: string): Promise<OcrToken[]> {
  // Dynamic import keeps ~2MB of Tesseract out of the initial bundle.
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("kor");
  try {
    const dataUrl = imageBase64.startsWith("data:")
      ? imageBase64
      : `data:image/jpeg;base64,${imageBase64}`;
    const { data } = await worker.recognize(dataUrl);
    const tokens: OcrToken[] = [];
    for (const word of data.words ?? []) {
      const text = word.text?.trim();
      if (!text) continue;
      const { x0, y0, x1, y1 } = word.bbox;
      tokens.push({ text, bbox: [x0, y0, x1 - x0, y1 - y0] });
    }
    return tokens;
  } finally {
    await worker.terminate();
  }
}
