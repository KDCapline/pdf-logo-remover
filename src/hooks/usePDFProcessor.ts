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
    pageRects: Record<number, Rectangle>,
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
      pageRects: Record<number, Rectangle>,
      signal: ProcessSignal,
    ): Promise<ReportItem> => {
      const updateFile = (patch: Partial<PDFFileItem>): void => {
        updateFileRef.current(item.id, patch);
      };

      try {
        if (signal.canceled) {
          throw new Error("canceled");
        }

        const markedPages = Object.keys(pageRects)
          .map((k) => Number.parseInt(k, 10))
          .filter((i) => Number.isFinite(i))
          .sort((a, b) => a - b);

        if (markedPages.length === 0) {
          return {
            name: item.name,
            status: "skipped",
            reason: "No pages marked for replacement",
          };
        }

        const doc = await loadPdf(item.file);
        const pageCount = await getPageCount(doc);
        await doc.cleanup();

        // Only replace pages that exist in this PDF.
        const applicableRects: Record<number, Rectangle> = {};
        for (const pageIndex of markedPages) {
          if (pageIndex >= 0 && pageIndex < pageCount) {
            applicableRects[pageIndex] = pageRects[pageIndex];
          }
        }

        if (signal.canceled) {
          throw new Error("canceled");
        }

        if (Object.keys(applicableRects).length === 0) {
          return {
            name: item.name,
            status: "skipped",
            reason: "Marked pages are out of range for this PDF",
          };
        }

        const firstPage = Number.parseInt(Object.keys(applicableRects)[0] ?? "0", 10);
        updateFile({ currentPage: firstPage });

        const { blob, matched } = await replaceLogoInPdf(
          item.file,
          newLogo,
          applicableRects,
          signal,
        );

        if (signal.canceled) {
          throw new Error("canceled");
        }

        const blobUrl = URL.createObjectURL(blob);
        updateFile({ resultBlobUrl: blobUrl });

        if (matched === 0) {
          return {
            name: item.name,
            status: "skipped",
            reason: "No pages were replaced",
          };
        }

        return {
          name: item.name,
          status: "processed",
          reason: `Logo replaced on ${matched} page${matched === 1 ? "" : "s"}`,
        };
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
