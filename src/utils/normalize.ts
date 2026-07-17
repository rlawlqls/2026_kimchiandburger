import type { Bbox } from "../types";

/** Pixel bbox → 0~1 normalized bbox so overlays render at any display size. */
export function normalizeBbox(bbox: Bbox, imageWidth: number, imageHeight: number): Bbox {
  const [x, y, w, h] = bbox;
  return [
    Math.max(0, Math.min(1, x / imageWidth)),
    Math.max(0, Math.min(1, y / imageHeight)),
    Math.max(0, Math.min(1, w / imageWidth)),
    Math.max(0, Math.min(1, h / imageHeight)),
  ];
}
