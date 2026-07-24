import type { OcrResult, OcrToken } from "../types";

/**
 * Single OCR interface with automatic failover (§3-2):
 *   1) Google Cloud Vision via /api/vision — a real OCR engine, so it is both the
 *      fastest (~0.5s) and the only one with true pixel bounding boxes
 *   2) Gemma vision via /api/ocr — slower and its boxes are estimates, but it
 *      runs on the free Gemini tier when no Vision key is configured
 *   3) Tesseract.js (kor) fully client-side — no API key needed
 * Keys for 1 and 2 stay server-side. All three return the same shape:
 * [{ text, bbox: [x, y, w, h] }] in pixels.
 */
export async function runOcr(
  imageBase64: string,
  imageWidth: number,
  imageHeight: number,
): Promise<OcrResult> {
  try {
    const tokens = await visionOcr(imageBase64);
    return { tokens, engine: "vision", imageWidth, imageHeight };
  } catch (visionErr) {
    console.warn("Cloud Vision unavailable, falling back to Gemma:", visionErr);
    try {
      const tokens = await cloudOcr(imageBase64, imageWidth, imageHeight);
      return { tokens, engine: "gemma", imageWidth, imageHeight };
    } catch (gemmaErr) {
      console.warn("Cloud OCR unavailable, falling back to Tesseract:", gemmaErr);
      const tokens = await tesseractOcr(imageBase64);
      return { tokens, engine: "tesseract", imageWidth, imageHeight };
    }
  }
}

async function visionOcr(imageBase64: string): Promise<OcrToken[]> {
  // A purpose-built OCR call is fast; don't sit on a stalled one for long.
  const data = await postJson<{ tokens?: OcrToken[] }>(
    "/api/vision",
    { image: imageBase64 },
    8000,
  );
  if (!Array.isArray(data.tokens)) throw new Error("Malformed /api/vision response");
  // An empty read is not a usable result — let the caller fall through.
  if (data.tokens.length === 0) throw new Error("/api/vision found no text");
  return data.tokens;
}

async function cloudOcr(
  imageBase64: string,
  imageWidth: number,
  imageHeight: number,
): Promise<OcrToken[]> {
  // Gemma vision can take a while (it "thinks" before answering); fall back after 30s.
  const data = await postJson<{ tokens?: OcrToken[] }>(
    "/api/ocr",
    { image: imageBase64, width: imageWidth, height: imageHeight },
    30000,
  );
  if (!Array.isArray(data.tokens)) throw new Error("Malformed /api/ocr response");
  return data.tokens;
}

async function postJson<T>(url: string, body: unknown, timeoutMs: number): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`${url} responded ${res.status}`);
    return (await res.json()) as T;
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
