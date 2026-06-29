// Canvas helpers used by services and UI for thumbnails / rasterization.
// Strict typing: no `any`.

export function releaseCanvas(canvas: HTMLCanvasElement | null | undefined): void {
  if (!canvas) return;
  // Setting width=0 and height=0 frees the underlying bitmap memory.
  canvas.width = 0;
  canvas.height = 0;
}

export function canvasToDataURL(
  canvas: HTMLCanvasElement,
  type: string = "image/png",
  quality?: number,
): string {
  return canvas.toDataURL(type, quality);
}

export function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string = "image/png",
  quality?: number,
): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("canvas.toBlob returned null"));
      },
      type,
      quality,
    );
  });
}