// Crop a rectangular region out of a video frame or an <img>, mapping the box the
// user dragged over the finder (in container-percent coords) back to the media's
// natural pixels through the CSS `object-fit: cover` transform.
//
// The finder shows the media with object-cover, so the displayed picture is scaled
// up and centre-cropped. To read "only the box", we invert that transform.

export interface BoxPct {
  /** all 0~1, relative to the finder container */
  left: number;
  top: number;
  width: number;
  height: number;
}

type Media = HTMLVideoElement | HTMLImageElement;

function naturalSize(media: Media): { w: number; h: number } {
  if (media instanceof HTMLVideoElement) {
    return { w: media.videoWidth, h: media.videoHeight };
  }
  return { w: media.naturalWidth, h: media.naturalHeight };
}

/**
 * Return a JPEG data URL of the boxed region, or null if the media isn't ready.
 * @param container displayed finder size in CSS px
 */
export function cropFromMedia(
  media: Media,
  box: BoxPct,
  container: { width: number; height: number },
): string | null {
  const { w: nw, h: nh } = naturalSize(media);
  if (!nw || !nh || !container.width || !container.height) return null;

  // object-cover: scale so the media fully covers the container, then centre it.
  const scale = Math.max(container.width / nw, container.height / nh);
  const dispW = nw * scale;
  const dispH = nh * scale;
  const offsetX = (container.width - dispW) / 2; // ≤ 0
  const offsetY = (container.height - dispH) / 2; // ≤ 0

  // Box corners in container px → natural px.
  const cx0 = box.left * container.width;
  const cy0 = box.top * container.height;
  const cx1 = (box.left + box.width) * container.width;
  const cy1 = (box.top + box.height) * container.height;

  const toNatX = (cx: number) => clamp((cx - offsetX) / scale, 0, nw);
  const toNatY = (cy: number) => clamp((cy - offsetY) / scale, 0, nh);

  const sx = toNatX(cx0);
  const sy = toNatY(cy0);
  const sw = Math.max(1, toNatX(cx1) - sx);
  const sh = Math.max(1, toNatY(cy1) - sy);

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(sw);
  canvas.height = Math.round(sh);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(media, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.9);
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
