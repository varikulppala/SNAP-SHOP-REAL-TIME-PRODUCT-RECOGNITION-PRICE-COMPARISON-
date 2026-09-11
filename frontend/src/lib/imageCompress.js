/**
 * Downscale and re-encode as JPEG so base64 payloads stay under API limits
 * (Retina screenshots can exceed Express / Vision size limits when sent raw).
 */
export function compressDataUrlForUpload(
  dataUrl,
  { maxSide = 1920, quality = 0.88 } = {}
) {
  if (typeof window === "undefined") {
    return Promise.resolve(dataUrl);
  }
  if (!dataUrl || typeof dataUrl !== "string" || !dataUrl.startsWith("data:")) {
    return Promise.resolve(dataUrl);
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        let { naturalWidth: w, naturalHeight: h } = img;
        if (!w || !h) {
          resolve(dataUrl);
          return;
        }
        const scale = Math.min(1, maxSide / Math.max(w, h));
        const width = Math.max(1, Math.round(w * scale));
        const height = Math.max(1, Math.round(h * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => reject(new Error("Could not decode image for upload"));
    img.src = dataUrl;
  });
}
