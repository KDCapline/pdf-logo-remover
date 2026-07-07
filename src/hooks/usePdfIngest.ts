// usePdfIngest: shared logic for turning raw File objects into queue items.
// Builds PDFFileItem records, adds them to the store (which hard-caps at
// MAX_PDFS), then asynchronously loads page count + a first-page thumbnail.
// Used by both the dropzone and the "restore rejected file" action so the
// behaviour (and thumbnails) stay identical.
import { useCallback } from "react";
import { toast } from "sonner";
import { useAppStore } from "@/store/useAppStore";
import {
  loadPdf,
  getPageCount,
  renderPageThumbnail,
} from "@/services/pdfRenderer";
import { uid } from "@/utils/pdf";
import { MAX_PDFS, type PDFFileItem } from "@/types";

function buildItem(file: File): PDFFileItem {
  return {
    id: uid(),
    file,
    name: file.name,
    size: file.size,
    pageCount: 0,
    thumbnailUrl: null,
    status: "pending",
    progress: 0,
    currentPage: 0,
    selectedPages: [],
  };
}

export interface PdfIngest {
  /** Remaining slots before the MAX_PDFS cap is hit. */
  roomLeft: () => number;
  /** Build + add the given files to the queue and load their metadata. */
  ingest: (files: File[]) => void;
}

export function usePdfIngest(): PdfIngest {
  const addFiles = useAppStore((state) => state.addFiles);
  const updateFile = useAppStore((state) => state.updateFile);

  const loadMetadata = useCallback(
    async (item: PDFFileItem): Promise<void> => {
      try {
        const doc = await loadPdf(item.file);
        try {
          const pageCount = await getPageCount(doc);
          let thumbnailUrl: string | null = null;
          try {
            thumbnailUrl = await renderPageThumbnail(doc, 0, 220);
          } catch {
            thumbnailUrl = null;
          }
          updateFile(item.id, { pageCount, thumbnailUrl });
        } finally {
          await doc.cleanup();
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        updateFile(item.id, { status: "error", error: message });
        toast.error(`Failed to read "${item.name}": ${message}`);
      }
    },
    [updateFile],
  );

  const roomLeft = useCallback(
    (): number => Math.max(0, MAX_PDFS - useAppStore.getState().files.length),
    [],
  );

  const ingest = useCallback(
    (files: File[]): void => {
      if (files.length === 0) return;
      const items = files.map(buildItem);
      addFiles(items);
      for (const item of items) void loadMetadata(item);
    },
    [addFiles, loadMetadata],
  );

  return { roomLeft, ingest };
}
