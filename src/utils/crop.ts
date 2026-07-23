/**
 * Crop a live <video> frame to the on-screen reticle rectangle so OCR only reads
 * the box the user aimed at (not the whole frame).
 *
 * The <video> uses `object-cover`, so the intrinsic frame is scaled by
 * max(elW/vidW, elH/vidH) and center-cropped to fill the element. We invert that
 * mapping to turn the reticle's screen rect into intrinsic pixel coordinates.
 */
export function cropVideoToRect(
  video: HTMLVideoElement,
  reticle: DOMRect,
): string | null {
  const vidW = video.videoWidth;
  const vidH = video.videoHeight;
  if (vidW === 0 || vidH === 0) return null;

  const elRect = video.getBoundingClientRect();
  if (elRect.width === 0 || elRect.height === 0) return null;

  // object-cover: the frame is scaled up until it fully covers the element.
  const scale = Math.max(elRect.width / vidW, elRect.height / vidH);
  const dispW = vidW * scale; // frame size as displayed (may overflow the element)
  const dispH = vidH * scale;
  const offsetX = (elRect.width - dispW) / 2; // negative = cropped on the sides
  const offsetY = (elRect.height - dispH) / 2;

  // Reticle rect relative to the video element's top-left, then into frame pixels.
  const relX = reticle.left - elRect.left;
  const relY = reticle.top - elRect.top;
  let sx = (relX - offsetX) / scale;
  let sy = (relY - offsetY) / scale;
  let sw = reticle.width / scale;
  let sh = reticle.height / scale;

  // Clamp to the frame so drawImage never reads out of bounds.
  sx = Math.max(0, Math.min(vidW, sx));
  sy = Math.max(0, Math.min(vidH, sy));
  sw = Math.max(1, Math.min(vidW - sx, sw));
  sh = Math.max(1, Math.min(vidH - sy, sh));

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(sw);
  canvas.height = Math.round(sh);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.9);
}
