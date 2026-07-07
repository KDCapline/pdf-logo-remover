// Template-based logo location: find where a marked logo appears on each page,
// even when PDFs use different alignments.
import { loadPdf, renderPageToCanvas } from "@/services/pdfRenderer";
import { releaseCanvas } from "@/utils/canvas";
import type { PageReplacementMark, Rectangle } from "@/types";
import {
  DEFAULT_MATCH_THRESHOLD,
  DEFAULT_SAMPLE_SIZE,
  correlation,
  filterPageRectsWithLogo,
  vectorFromCanvasRegion,
  vectorFromDataUrl,
} from "@/services/logoMatcher";

export interface LocateSignal {
  canceled: boolean;
}

export interface LocateOptions {
  threshold?: number;
  sampleSize?: number;
}

/** Threshold for template search (lower than fixed-position smart matching). */
export const LOCATE_MATCH_THRESHOLD = 0.42;
/** Minimum score at the user-drawn hint position before accepting it as fallback. */
const HINT_FALLBACK_THRESHOLD = 0.32;

export type TemplateVectorCache = Map<string, Float32Array | null>;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Render scale used for both template capture and page search. */
export function locateRenderScale(rectWidth: number, sampleSize = DEFAULT_SAMPLE_SIZE): number {
  const targetPx = sampleSize * 8;
  return clamp(targetPx / Math.max(1, rectWidth), 0.5, 3);
}

function cropCanvasRegion(
  canvas: HTMLCanvasElement,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
): string {
  const cw = canvas.width;
  const ch = canvas.height;
  const clampedW = Math.min(sw, cw - sx);
  const clampedH = Math.min(sh, ch - sy);
  if (clampedW < 2 || clampedH < 2 || sx < 0 || sy < 0) return "";

  const crop = document.createElement("canvas");
  crop.width = clampedW;
  crop.height = clampedH;
  const ctx = crop.getContext("2d");
  if (!ctx) return "";
  ctx.drawImage(canvas, sx, sy, clampedW, clampedH, 0, 0, clampedW, clampedH);
  return crop.toDataURL("image/png");
}

async function getTemplateVector(
  dataUrl: string,
  sampleSize: number,
  cache: TemplateVectorCache,
): Promise<Float32Array | null> {
  if (cache.has(dataUrl)) return cache.get(dataUrl) ?? null;
  const vector = await vectorFromDataUrl(dataUrl, sampleSize);
  cache.set(dataUrl, vector);
  return vector;
}

/**
 * Render the page at the same scale used for search and crop the marked region.
 * This keeps the template consistent with what auto-locate compares against.
 */
export async function captureMarkTemplate(
  file: File,
  pageIndex: number,
  rect: Rectangle,
): Promise<string> {
  if (rect.width <= 0 || rect.height <= 0) return "";

  const doc = await loadPdf(file);
  try {
    if (pageIndex < 0 || pageIndex >= doc.numPages) return "";
    const scale = locateRenderScale(rect.width);
    const { canvas } = await renderPageToCanvas(doc, pageIndex, scale);
    try {
      const sx = Math.round(rect.x * scale);
      const sy = Math.round(rect.y * scale);
      const sw = Math.round(rect.width * scale);
      const sh = Math.round(rect.height * scale);
      return cropCanvasRegion(canvas, sx, sy, sw, sh);
    } finally {
      releaseCanvas(canvas);
    }
  } finally {
    await doc.cleanup();
  }
}

interface SearchResult {
  score: number;
  x: number;
  y: number;
}

function scoreAt(
  pageCanvas: HTMLCanvasElement,
  x: number,
  y: number,
  tw: number,
  th: number,
  templateVector: Float32Array,
  sampleSize: number,
): number | null {
  if (x < 0 || y < 0 || x + tw > pageCanvas.width || y + th > pageCanvas.height) {
    return null;
  }
  const vec = vectorFromCanvasRegion(pageCanvas, x, y, tw, th, sampleSize);
  if (!vec) return null;
  return correlation(templateVector, vec);
}

function searchOnRenderedPage(
  pageCanvas: HTMLCanvasElement,
  scale: number,
  templateVector: Float32Array,
  templatePdfW: number,
  templatePdfH: number,
  sampleSize: number,
  threshold: number,
  hintRect?: Rectangle,
  fullPage = true,
): Rectangle | null {
  const tw = Math.max(2, Math.round(templatePdfW * scale));
  const th = Math.max(2, Math.round(templatePdfH * scale));
  const pw = pageCanvas.width;
  const ph = pageCanvas.height;
  if (tw > pw || th > ph) return null;

  let best: SearchResult = { score: -1, x: 0, y: 0 };
  const seen = new Set<string>();

  const tryPosition = (x: number, y: number): void => {
    const key = `${x},${y}`;
    if (seen.has(key)) return;
    seen.add(key);
    const score = scoreAt(pageCanvas, x, y, tw, th, templateVector, sampleSize);
    if (score != null && score > best.score) {
      best = { score, x, y };
    }
  };

  // Always evaluate the user-drawn hint and its neighbourhood first.
  if (hintRect) {
    const hx = Math.round(hintRect.x * scale);
    const hy = Math.round(hintRect.y * scale);
    const radius = fullPage
      ? Math.max(4, Math.floor(Math.min(tw, th) / 3))
      : Math.max(8, Math.floor(Math.min(tw, th) / 2));
    const step = fullPage ? 2 : 1;
    for (let dy = -radius; dy <= radius; dy += step) {
      for (let dx = -radius; dx <= radius; dx += step) {
        tryPosition(hx + dx, hy + dy);
      }
    }
  }

  if (!fullPage) {
    if (best.score < threshold) return null;
    return {
      x: best.x / scale,
      y: best.y / scale,
      width: templatePdfW,
      height: templatePdfH,
    };
  }

  const coarseStride = clamp(Math.floor(Math.min(tw, th) / 6), 3, 12);
  for (let y = 0; y <= ph - th; y += coarseStride) {
    for (let x = 0; x <= pw - tw; x += coarseStride) {
      tryPosition(x, y);
    }
  }

  if (best.score < threshold) return null;

  const fineRadius = coarseStride * 2;
  const fineStride = Math.max(1, Math.floor(coarseStride / 3));
  const refine: SearchResult = { ...best };
  for (
    let y = Math.max(0, best.y - fineRadius);
    y <= Math.min(ph - th, best.y + fineRadius);
    y += fineStride
  ) {
    for (
      let x = Math.max(0, best.x - fineRadius);
      x <= Math.min(pw - tw, best.x + fineRadius);
      x += fineStride
    ) {
      const score = scoreAt(pageCanvas, x, y, tw, th, templateVector, sampleSize);
      if (score != null && score > refine.score) {
        refine.score = score;
        refine.x = x;
        refine.y = y;
      }
    }
  }

  if (refine.score < threshold) return null;

  return {
    x: refine.x / scale,
    y: refine.y / scale,
    width: templatePdfW,
    height: templatePdfH,
  };
}

function scoreAtHint(
  pageCanvas: HTMLCanvasElement,
  scale: number,
  hintRect: Rectangle,
  templateVector: Float32Array,
  templatePdfW: number,
  templatePdfH: number,
  sampleSize: number,
): SearchResult | null {
  const tw = Math.max(2, Math.round(templatePdfW * scale));
  const th = Math.max(2, Math.round(templatePdfH * scale));
  const hx = Math.round(hintRect.x * scale);
  const hy = Math.round(hintRect.y * scale);
  const score = scoreAt(pageCanvas, hx, hy, tw, th, templateVector, sampleSize);
  if (score == null) return null;
  return { score, x: hx, y: hy };
}

async function locateOnPage(
  doc: Awaited<ReturnType<typeof loadPdf>>,
  pageIndex: number,
  mark: PageReplacementMark,
  templateVector: Float32Array,
  sampleSize: number,
  threshold: number,
  signal?: LocateSignal,
): Promise<Rectangle | null> {
  if (signal?.canceled) throw new Error("canceled");
  if (pageIndex < 0 || pageIndex >= doc.numPages) return null;

  const scale = locateRenderScale(mark.rect.width, sampleSize);
  const { canvas } = await renderPageToCanvas(doc, pageIndex, scale);
  try {
    if (signal?.canceled) throw new Error("canceled");

    const hint = scoreAtHint(
      canvas,
      scale,
      mark.rect,
      templateVector,
      mark.rect.width,
      mark.rect.height,
      sampleSize,
    );
    if (hint && hint.score >= threshold) {
      return {
        x: hint.x / scale,
        y: hint.y / scale,
        width: mark.rect.width,
        height: mark.rect.height,
      };
    }

    // Search a wider neighbourhood before scanning the full page.
    const nearHint = searchOnRenderedPage(
      canvas,
      scale,
      templateVector,
      mark.rect.width,
      mark.rect.height,
      sampleSize,
      threshold,
      mark.rect,
      false,
    );
    if (nearHint) return nearHint;

    const found = searchOnRenderedPage(
      canvas,
      scale,
      templateVector,
      mark.rect.width,
      mark.rect.height,
      sampleSize,
      threshold,
      mark.rect,
      true,
    );
    if (found) return found;

    if (hint && hint.score >= HINT_FALLBACK_THRESHOLD) {
      return {
        x: hint.x / scale,
        y: hint.y / scale,
        width: mark.rect.width,
        height: mark.rect.height,
      };
    }

    return null;
  } finally {
    releaseCanvas(canvas);
  }
}

/**
 * Resolve replacement rectangles for a PDF.
 *
 * Fast path: try fixed rects (optionally filtered by smart match).
 * Slow path: auto-locate only for pages where the fast path did not find a match.
 */
export async function resolveReplacementRects(
  file: File,
  marksByPage: Record<number, PageReplacementMark>,
  options: {
    autoLocate: boolean;
    smartMatch: boolean;
    signal?: LocateSignal;
    threshold?: number;
    sampleSize?: number;
    vectorCache?: TemplateVectorCache;
  },
): Promise<Record<number, Rectangle>> {
  const locateThreshold = options.threshold ?? LOCATE_MATCH_THRESHOLD;
  const sampleSize = options.sampleSize ?? DEFAULT_SAMPLE_SIZE;
  const vectorCache = options.vectorCache ?? new Map<string, Float32Array | null>();

  const pages = Object.keys(marksByPage)
    .map((k) => Number.parseInt(k, 10))
    .filter((i) => Number.isFinite(i))
    .sort((a, b) => a - b);

  if (pages.length === 0) return {};

  const fixed: Record<number, Rectangle> = {};
  for (const pageIndex of pages) {
    const mark = marksByPage[pageIndex];
    if (mark) fixed[pageIndex] = mark.rect;
  }

  let resolved: Record<number, Rectangle> = { ...fixed };
  let pagesNeedingLocate = pages;

  if (options.smartMatch) {
    const filtered = await filterPageRectsWithLogo(file, fixed, options.signal, {
      threshold: DEFAULT_MATCH_THRESHOLD,
      sampleSize,
    });
    if (Object.keys(filtered).length > 0) {
      resolved = { ...filtered };
      if (options.autoLocate) {
        pagesNeedingLocate = pages.filter((pageIndex) => !(pageIndex in filtered));
      } else {
        return filtered;
      }
    } else if (!options.autoLocate) {
      return fixed;
    }
  } else if (!options.autoLocate) {
    return fixed;
  }

  if (!options.autoLocate || pagesNeedingLocate.length === 0) {
    return resolved;
  }

  const doc = await loadPdf(file);
  try {
    for (const pageIndex of pagesNeedingLocate) {
      if (options.signal?.canceled) throw new Error("canceled");
      const mark = marksByPage[pageIndex];
      if (!mark || mark.rect.width <= 0 || mark.rect.height <= 0) continue;

      if (!mark.templateDataUrl) {
        resolved[pageIndex] = mark.rect;
        continue;
      }

      const templateVector = await getTemplateVector(
        mark.templateDataUrl,
        sampleSize,
        vectorCache,
      );
      if (!templateVector) {
        resolved[pageIndex] = mark.rect;
        continue;
      }

      const located = await locateOnPage(
        doc,
        pageIndex,
        mark,
        templateVector,
        sampleSize,
        locateThreshold,
        options.signal,
      );

      resolved[pageIndex] = located ?? mark.rect;
    }

    return resolved;
  } finally {
    await doc.cleanup();
  }
}
