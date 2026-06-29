// Image loading helpers — all client-side, async, strict typing.

export async function fileToDataURL(file: File): Promise<string> {
  return await file.arrayBuffer().then((buffer) => {
    const bytes = new Uint8Array(buffer);
    // btoa needs a binary string; build it chunk-wise to avoid call-stack overflow on large files.
    let binary = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const slice = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode(...slice);
    }
    const base64 = btoa(binary);
    return `data:${file.type || "application/octet-stream"};base64,${base64}`;
  });
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

export async function fileToImageBitmap(file: File): Promise<ImageBitmap> {
  return await createImageBitmap(file);
}