// Content-aware logo matching.
//
// The user draws a single rectangle on the first page to mark the logo. The
// same rectangle coordinates are *candidates* on every other page, but a page
// only actually contains the logo if the pixels in that region look like the
// reference. This service renders each candidate region with pdfjs and decides,
// per page, whether it matches the reference region from the first page.
//
// Matching uses normalized cross-correlation (NCC) on a small grayscale
// thumbnail of the region. NCC is invariant to global brightness/contrast
// shifts (so anti-aliasing or minor render differences across identical pages
// don't break the match) while still rejecting unrelated text/graphics/blank
// areas at the same coordinates.
import { loadPdf, renderPageToCanvas } from "@/services/pdfRenderer";
import { releaseCanvas } from "@/utils/canvas";
import type { Rectangle } from "@/types";

export interface MatchSignal {
  canceled: boolean;
}

export interface LogoMatchOptions {
  /**
   * NCC similarity in [-1, 1] at/above which a region is considered the same
   * logo. ~1 means near-identical; unrelated content is typically < 0.4.
   */
  threshold?: number;
  /** Edge length of the square thumbnail the region is reduced to. */
  sampleSize?: number;
}

/** Default similarity threshold — tuned to accept the same logo while
 *  rejecting text/graphics/blank regions at matching coordinates. */
export const DEFAULT_MATCH_THRESHOLD = 0.6;
const DEFAULT_SAMPLE_SIZE = 32;
/** Regions flatter than this grayscale std-dev are treated as blank. */
const MIN_REGION_STD = 2.0;

interface RegionDescriptor {
  /**
   * Zero-mean, unit-L2-norm grayscale vector for the region, or null when the
   * region is blank / too small to describe (and therefore cannot match).
   */
  vector: Float32Array | null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Render `pageIndex` and reduce the rect region to a normalized grayscale
 * descriptor. Coordinates in `rect` are in PDF points (scale 1, top-left
 * origin) — the same space the rect is stored in by the preview.
 */
async function describeRegion(
  doc: Awaited<ReturnType<typeof loadPdf>>,
  pageIndex: number,
  rect: Rectangle,
  sampleSize: number,
  signal?: MatchSignal,
): Promise<RegionDescriptor | null> {
  if (signal?.canceled) throw new Error("canceled");
  if (rect.width <= 0 || rect.height <= 0) return { vector: null };

  // Render just large enough that the region keeps some detail, then downscale.
  const targetPx = sampleSize * 4;
  const scale = clamp(targetPx / Math.max(1, rect.width), 0.15, 2.5);

  const { canvas } = await renderPageToCanvas(doc, pageIndex, scale);
  try {
    const cw = canvas.width;
    const ch = canvas.height;

    let sx = Math.round(rect.x * scale);
    let sy = Math.round(rect.y * scale);
    let sw = Math.round(rect.width * scale);
    let sh = Math.round(rect.height * scale);

    // Clamp the source rectangle to the page bounds.
    if (sx < 0) {
      sw += sx;
      sx = 0;
    }
    if (sy < 0) {
      sh += sy;
      sy = 0;
    }
    if (sx + sw > cw) sw = cw - sx;
    if (sy + sh > ch) sh = ch - sy;
    if (sw < 2 || sh < 2) return { vector: null };

    const small = document.createElement("canvas");
    small.width = sampleSize;
    small.height = sampleSize;
    const sctx = small.getContext("2d", { willReadFrequently: true });
    if (!sctx) return { vector: null };
    // White background so out-of-bounds / transparent areas read as paper.
    sctx.fillStyle = "#ffffff";
    sctx.fillRect(0, 0, sampleSize, sampleSize);
    sctx.drawImage(canvas, sx, sy, sw, sh, 0, 0, sampleSize, sampleSize);

    const { data } = sctx.getImageData(0, 0, sampleSize, sampleSize);
    const n = sampleSize * sampleSize;
    const gray = new Float32Array(n);
    let mean = 0;
    for (let i = 0; i < n; i++) {
      const r = data[i * 4];
      const g = data[i * 4 + 1];
      const b = data[i * 4 + 2];
      const a = data[i * 4 + 3];
      const v = a === 0 ? 255 : 0.299 * r + 0.587 * g + 0.114 * b;
      gray[i] = v;
      mean += v;
    }
    mean /= n;

    let sumSq = 0;
    for (let i = 0; i < n; i++) {
      gray[i] -= mean;
      sumSq += gray[i] * gray[i];
    }
    const std = Math.sqrt(sumSq / n);
    if (std < MIN_REGION_STD) return { vector: null }; // essentially blank

    const norm = Math.sqrt(sumSq);
    for (let i = 0; i < n; i++) gray[i] /= norm;
    return { vector: gray };
  } finally {
    releaseCanvas(canvas);
  }
}

/** Normalized cross-correlation of two unit-norm, zero-mean vectors → [-1, 1]. */
function correlation(a: Float32Array, b: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}

/**
 * Decide which of `candidatePages` actually contain the logo found in the
 * `rect` region of `referencePage`. The reference page itself is always
 * included (when present in the candidates) since it holds the logo by
 * definition.
 *
 * Fallback: if the reference region can't be described (e.g. blank or render
 * failure), we return all candidate pages unchanged so behaviour is never
 * worse than the previous "replace everywhere" approach.
 */
export async function findLogoPages(
  file: File,
  rect: Rectangle,
  candidatePages: number[],
  referencePage = 0,
  signal?: MatchSignal,
  options?: LogoMatchOptions,
): Promise<number[]> {
  const threshold = options?.threshold ?? DEFAULT_MATCH_THRESHOLD;
  const sampleSize = options?.sampleSize ?? DEFAULT_SAMPLE_SIZE;

  if (candidatePages.length === 0) return [];

  const doc = await loadPdf(file);
  try {
    const total = doc.numPages;

    let reference: RegionDescriptor | null = null;
    if (referencePage >= 0 && referencePage < total) {
      reference = await describeRegion(
        doc,
        referencePage,
        rect,
        sampleSize,
        signal,
      );
    }

    // Can't characterize the logo → don't silently drop pages; replace all.
    if (!reference || !reference.vector) {
      return candidatePages.slice();
    }
    const refVector = reference.vector;

    const matched: number[] = [];
    for (const pageIndex of candidatePages) {
      if (signal?.canceled) throw new Error("canceled");
      if (pageIndex < 0 || pageIndex >= total) continue;
      if (pageIndex === referencePage) {
        matched.push(pageIndex);
        continue;
      }
      const desc = await describeRegion(
        doc,
        pageIndex,
        rect,
        sampleSize,
        signal,
      );
      if (desc?.vector && correlation(refVector, desc.vector) >= threshold) {
        matched.push(pageIndex);
      }
    }
    return matched;
  } finally {
    await doc.cleanup();
  }
}
