// usePDFProcessor: orchestrates PDF load → replace. The UI never touches
// pdfjs/pdf-lib directly; it goes through this hook and the services it
// coordinates.
import { useCallback, useRef } from "react";
import type {
  LogoImage,
  PDFFileItem,
  Rectangle,
  ReportItem,
} from "@/types";
import { loadPdf, renderPageToCanvas, getPageCount } from "@/services/pdfRenderer";
import { replaceLogoInPdf } from "@/services/pdfEditor";
import { releaseCanvas } from "@/utils/canvas";
import { useAppStore } from "@/store/useAppStore";

export interface ProcessSignal {
  canceled: boolean;
}

export interface PreviewHandle {
  canvas: HTMLCanvasElement;
  cleanup: () => void;
}

function isAbortError(err: unknown): boolean {
  return (
    err instanceof Error &&
    (err.message === "canceled" || /canceled/i.test(err.message))
  );
}

export function usePDFProcessor(): {
  processFile: (
    item: PDFFileItem,
    newLogo: LogoImage,
    rect: Rectangle,
    signal: ProcessSignal,
  ) => Promise<ReportItem>;
  renderPageForPreview: (
    file: File,
    pageIndex: number,
    scale: number,
  ) => Promise<PreviewHandle>;
} {
  const updateFileRef = useRef(useAppStore.getState().updateFile);
  // Keep the latest updateFile without re-creating the callbacks each render.
  updateFileRef.current = useAppStore.getState().updateFile;

  const processFile = useCallback(
    async (
      item: PDFFileItem,
      newLogo: LogoImage,
      rect: Rectangle,
      signal: ProcessSignal,
    ): Promise<ReportItem> => {
      const updateFile = (patch: Partial<PDFFileItem>): void => {
        updateFileRef.current(item.id, patch);
      };

      try {
        if (signal.canceled) {
          throw new Error("canceled");
        }

        // Resolve selected pages (empty → all pages) so we can report progress
        // and short-circuit on cancellation between pages.
        const doc = await loadPdf(item.file);
        const pageCount = await getPageCount(doc);
        await doc.cleanup();

        const selectedPages: number[] =
          item.selectedPages && item.selectedPages.length > 0
            ? item.selectedPages
            : Array.from({ length: pageCount }, (_, i) => i);

        if (signal.canceled) {
          throw new Error("canceled");
        }

        updateFile({ currentPage: selectedPages[0] ?? 0 });

        const { blob, matched } = await replaceLogoInPdf(
          item.file,
          newLogo,
          rect,
          selectedPages,
          signal,
        );

        if (signal.canceled) {
          throw new Error("canceled");
        }

        const blobUrl = URL.createObjectURL(blob);
        updateFile({ resultBlobUrl: blobUrl });

        if (matched === 0) {
          const report: ReportItem = {
            name: item.name,
            status: "skipped",
            reason: "No pages matched",
          };
          return report;
        }

        const report: ReportItem = {
          name: item.name,
          status: "processed",
        };
        return report;
      } catch (err: unknown) {
        if (isAbortError(err)) {
          return { name: item.name, status: "error", reason: "canceled" };
        }
        const message = err instanceof Error ? err.message : String(err);
        return { name: item.name, status: "error", reason: message };
      }
    },
    [],
  );

  const renderPageForPreview = useCallback(
    async (
      file: File,
      pageIndex: number,
      scale: number,
    ): Promise<PreviewHandle> => {
      const doc = await loadPdf(file);
      const { canvas } = await renderPageToCanvas(doc, pageIndex, scale);
      let destroyed = false;
      const cleanup = (): void => {
        if (destroyed) return;
        destroyed = true;
        releaseCanvas(canvas);
        void doc.cleanup();
      };
      return { canvas, cleanup };
    },
    [],
  );

  return { processFile, renderPageForPreview };
}