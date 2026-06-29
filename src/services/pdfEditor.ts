// Real PDF logo replacement using pdf-lib. All work happens client-side.
import { PDFDocument, rgb, type PDFImage } from "pdf-lib";
import type { LogoImage, Rectangle } from "@/types";

export interface ReplaceResult {
  blob: Blob;
  matched: number;
  skippedPages: number[];
}

/**
 * Rasterize an SVG data URL to a PNG data URL via a canvas. We render the SVG
 * at its natural size (or a default fallback when intrinsic size is unknown).
 *
 * Limitation: external resources referenced by the SVG (fonts, images) are
 * not loaded — the SVG must be self-contained. Most logo SVGs are.
 */
async function rasterizeSvgToPngDataUrl(svgDataUrl: string): Promise<string> {
  const img = await loadImage(svgDataUrl);
  // Some browsers report 0x0 for SVGs without an intrinsic size. Fall back
  // to a sensible logo size so we never produce an empty bitmap.
  const width = img.naturalWidth && img.width > 0 ? img.width : 512;
  const height = img.naturalHeight && img.height > 0 ? img.height : 512;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to acquire 2D canvas context for SVG rasterization");
  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL("image/png");
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

function isPng(mime: string, name: string): boolean {
  return mime === "image/png" || /\.png$/i.test(name);
}

function isJpg(mime: string, name: string): boolean {
  return (
    mime === "image/jpeg" ||
    /\.(jpe?g)$/i.test(name)
  );
}

/**
 * Embed a new logo into the PDF document. PNG and JPG are embedded directly;
 * SVG is rasterized to PNG first. Returns the embedded image plus its
 * intrinsic pixel dimensions (used to preserve aspect ratio on draw).
 */
async function embedLogo(
  pdf: PDFDocument,
  logo: LogoImage,
): Promise<{ image: PDFImage; width: number; height: number }> {
  let dataUrl = logo.dataUrl;
  let name = logo.name;
  let mime = logo.file.type || "";

  if (/^data:image\/svg/i.test(dataUrl)) {
    dataUrl = await rasterizeSvgToPngDataUrl(dataUrl);
    mime = "image/png";
    name = name.replace(/\.svg$/i, ".png");
  }

  const bytes = await (await fetch(dataUrl)).arrayBuffer();
  if (isPng(mime, name)) {
    const image = await pdf.embedPng(bytes);
    return { image, width: image.width, height: image.height };
  }
  if (isJpg(mime, name)) {
    const image = await pdf.embedJpg(bytes);
    return { image, width: image.width, height: image.height };
  }
  // Fallback: try PNG then JPG — pdf-lib will throw if the bytes are invalid.
  try {
    const image = await pdf.embedPng(bytes);
    return { image, width: image.width, height: image.height };
  } catch {
    const image = await pdf.embedJpg(bytes);
    return { image, width: image.width, height: image.height };
  }
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Apply page rotation to a rectangle expressed in un-rotated (top-left origin)
 * pixel coordinates. pdf-lib always draws in the page's un-rotated coordinate
 * space, so for 90/270 we swap width/height and translate accordingly.
 *
 * Assumption: the rect was drawn by the user on the page *as they see it*
 * (pdfjs applies rotation by default). For 90/270 that means the drawn rect's
 * x-axis corresponds to the page's y-axis — we swap to compensate.
 * 0 and 180 require no swap; 180 would in principle need a y-flip but pdfjs
 * already presents the page upright so the drawn coords are already in the
 * upright frame — hence we treat 180 the same as 0.
 */
function applyRotation(
  rect: Rect,
  rotation: 0 | 90 | 180 | 270,
): Rect {
  switch (rotation) {
    case 90:
    case 270:
      return {
        x: rect.y,
        y: rect.x,
        width: rect.height,
        height: rect.width,
      };
    case 0:
    case 180:
    default:
      return rect;
  }
}

/**
 * Replace a logo across selected pages of a PDF using a single user-drawn
 * rect. The same rect is applied to every page in `selectedPages` (or every
 * page when empty). The original content under the rect is covered with a
 * white rectangle, then the new logo is contain-fit into the rect (preserving
 * the new logo's aspect ratio).
 *
 * Note: the rect is in PDF units of the page it was drawn on. PDFs with
 * different page sizes will receive the rect at the same coordinates, which
 * may not correspond to the same visual position.
 */
export interface CancelSignal {
  canceled: boolean;
}

export async function replaceLogoInPdf(
  file: File,
  newLogo: LogoImage,
  rect: Rectangle,
  selectedPages: number[],
  signal?: CancelSignal,
): Promise<ReplaceResult> {
  if (signal?.canceled) throw new Error("canceled");

  const bytes = await file.arrayBuffer();
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const { image: newImg, width: imgW, height: imgH } = await embedLogo(pdf, newLogo);

  const totalPageCount = pdf.getPageCount();
  const pages =
    selectedPages.length > 0
      ? selectedPages.slice().sort((a, b) => a - b)
      : Array.from({ length: totalPageCount }, (_, i) => i);

  let matched = 0;
  const skippedPages: number[] = [];

  for (const pageIndex of pages) {
    if (signal?.canceled) throw new Error("canceled");
    if (pageIndex < 0 || pageIndex >= totalPageCount) {
      skippedPages.push(pageIndex);
      continue;
    }

    const page = pdf.getPage(pageIndex);
    const { height: ph } = page.getSize();
    const rotationAngle = page.getRotation().angle;
    const rotation = (((rotationAngle % 360) + 360) % 360) as 0 | 90 | 180 | 270;

    // pdf-lib coordinates are bottom-left origin; the drawn rect is top-left.
    // First apply rotation adjustment (may swap w/h), then flip y.
    const rotated = applyRotation(
      { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      rotation,
    );
    const pdfY = ph - (rotated.y + rotated.height);

    // Cover the old content with a white rectangle so it doesn't bleed through.
    page.drawRectangle({
      x: rotated.x,
      y: pdfY,
      width: rotated.width,
      height: rotated.height,
      color: rgb(1, 1, 1),
    });

    // Contain-fit the new logo inside the rect preserving aspect ratio.
    const aspect = imgW / imgH;
    let w = rotated.width;
    let h = rotated.width / aspect;
    if (h > rotated.height) {
      h = rotated.height;
      w = rotated.height * aspect;
    }
    const dx = rotated.x + (rotated.width - w) / 2;
    const dy = pdfY + (rotated.height - h) / 2;
    page.drawImage(newImg, { x: dx, y: dy, width: w, height: h });

    matched++;
  }

  const out = await pdf.save();
  // `out` is a `Uint8Array<ArrayBufferLike>`; pdf-lib always allocates a
  // fresh ArrayBuffer-backed buffer, but TS conservatively allows
  // SharedArrayBuffer. Cast to BlobPart via `unknown` for the Blob ctor.
  const blobPart = out as unknown as BlobPart;
  return {
    blob: new Blob([blobPart], { type: "application/pdf" }),
    matched,
    skippedPages,
  };
}