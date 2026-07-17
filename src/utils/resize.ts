const MAX_LONG_SIDE = 1280; // faster Vision round-trips + smaller upload (§5-A)

export interface ResizedImage {
  base64: string; // raw base64, no data: prefix
  dataUrl: string;
  width: number;
  height: number;
}

/** Load a File/Blob or object URL into a downscaled canvas and return base64 JPEG. */
export async function resizeImage(source: File | Blob | string): Promise<ResizedImage> {
  const url = typeof source === "string" ? source : URL.createObjectURL(source);
  try {
    const img = await loadImage(url);
    const scale = Math.min(1, MAX_LONG_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    const width = Math.round(img.naturalWidth * scale);
    const height = Math.round(img.naturalHeight * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");
    ctx.drawImage(img, 0, 0, width, height);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    return { base64: dataUrl.split(",")[1], dataUrl, width, height };
  } finally {
    if (typeof source !== "string") URL.revokeObjectURL(url);
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image"));
    img.src = url;
  });
}
