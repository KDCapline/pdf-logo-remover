// Client-side PDF rendering built on top of pdfjs-dist.
// The UI layer never touches pdfjs directly — it goes through this service.
import type {
  PDFDocumentProxy,
  PageViewport,
  PDFPageProxy,
} from "pdfjs-dist";
// Vite loads the worker source as a URL string we can hand to pdfjs.
import PdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

// Configure the worker once for the whole app. pdfjs reads this from its
// shared GlobalWorkerOptions singleton; setting `workerSrc` is what makes
// rendering non-blocking. Without it pdfjs falls back to a "fake worker"
// that runs on the main thread and blocks the UI.
type PdfjsModule = typeof import("pdfjs-dist");

let configured = false;
function ensureWorkerConfigured(module: PdfjsModule): void {
  if (configured) return;
  module.GlobalWorkerOptions.workerSrc = PdfjsWorker;
  configured = true;
}

async function getPdfjs(): Promise<PdfjsModule> {
  // Dynamic import keeps the main bundle lean and gives us the live module.
  const mod = (await import("pdfjs-dist")) as PdfjsModule;
  ensureWorkerConfigured(mod);
  return mod;
}

/**
 * Load a PDF file into a pdfjs `PDFDocumentProxy`. The returned proxy is the
 * entry point for page access, thumbnails, and text extraction.
 */
export async function loadPdf(file: File): Promise<PDFDocumentProxy> {
  const mod = await getPdfjs();
  // `getDocument` accepts a typed array directly. Wrap in a fresh Uint8Array
  // so we hand pdfjs a deterministic view over the file bytes.
  const buffer = await file.arrayBuffer();
  const data = new Uint8Array(buffer);
  const loadingTask = mod.getDocument({ data });
  return await loadingTask.promise;
}

/** Total page count for a loaded document. */
export async function getPageCount(doc: PDFDocumentProxy): Promise<number> {
  return doc.numPages;
}

export interface RenderedPage {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  viewport: PageViewport;
}

/**
 * Render a single page to a canvas at the given scale.
 * Pass in an existing canvas to reuse it (caller-owned lifetime).
 */
export async function renderPageToCanvas(
  doc: PDFDocumentProxy,
  pageIndex: number,
  scale: number,
  canvas?: HTMLCanvasElement,
): Promise<RenderedPage> {
  const page: PDFPageProxy = await doc.getPage(pageIndex + 1);
  const viewport = page.getViewport({ scale });
  const target = canvas ?? document.createElement("canvas");
  target.width = Math.ceil(viewport.width);
  target.height = Math.ceil(viewport.height);
  const ctx = target.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Failed to acquire 2D canvas context");
  // pdfjs requires a render context with the canvas set; awaiting the promise
  // blocks until rasterization completes. Newer pdfjs versions require the
  // `canvas` field too — when using `canvasContext` directly, set `canvas`
  // to null (per pdfjs RenderParameters docs).
  const renderTask = page.render({ canvas: null, canvasContext: ctx, viewport });
  await renderTask.promise;
  return { canvas: target, width: target.width, height: target.height, viewport };
}

/**
 * Render a page to a small PNG data URL suitable for list previews.
 * Picks the scale so the resulting width is ~`maxW` pixels (preserves aspect).
 */
export async function renderPageThumbnail(
  doc: PDFDocumentProxy,
  pageIndex: number,
  maxW = 220,
): Promise<string> {
  // Read the viewport at scale 1 to compute the aspect-preserving scale.
  const page = await doc.getPage(pageIndex + 1);
  const baseViewport = page.getViewport({ scale: 1 });
  const scale = Math.min(maxW / baseViewport.width, 1);
  // We no longer need the page proxy directly — renderPageToCanvas re-loads
  // it from the doc. Cast for optional cleanup hook.
  const pageRelease = page as unknown as { cleanup?: () => void };
  try {
    const { canvas } = await renderPageToCanvas(doc, pageIndex, scale);
    try {
      return canvas.toDataURL("image/png");
    } finally {
      // Free the bitmap memory eagerly.
      canvas.width = 0;
      canvas.height = 0;
    }
  } finally {
    pageRelease.cleanup?.();
  }
}

/** Wrap a canvas into an ImageBitmap for off-main-thread handoff. */
export async function makeImageBitmapFromCanvas(
  canvas: HTMLCanvasElement,
): Promise<ImageBitmap> {
  return await createImageBitmap(canvas);
}