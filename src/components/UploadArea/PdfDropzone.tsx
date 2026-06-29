// PdfDropzone: drop one or more PDFs, build PDFFileItem records, add to
// store, then asynchronously load each via pdfjs to fill pageCount and a
// first-page thumbnail.
import { useCallback } from "react";
import { FileText } from "lucide-react";
import { Dropzone } from "@/components/UploadArea/Dropzone";
import { useAppStore } from "@/store/useAppStore";
import { loadPdf, getPageCount, renderPageThumbnail } from "@/services/pdfRenderer";
import { uid } from "@/utils/pdf";
import { MAX_PDFS, type PDFFileItem } from "@/types";
import { toast } from "sonner";

const PDF_ACCEPT = {
  "application/pdf": [".pdf"],
} as const;

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

export function PdfDropzone() {
  const addFiles = useAppStore((state) => state.addFiles);
  const updateFile = useAppStore((state) => state.updateFile);
  const currentCount = useAppStore((state) => state.files.length);

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
        updateFile(item.id, {
          status: "error",
          error: message,
        });
        toast.error(`Failed to read "${item.name}": ${message}`);
      }
    },
    [updateFile],
  );

  const onFiles = useCallback(
    (files: File[]): void => {
      const remaining = MAX_PDFS - currentCount;

      if (remaining <= 0) {
        toast.warning(
          `You've reached the ${MAX_PDFS}-PDF limit. Remove some files before adding more.`,
        );
        return;
      }

      let incoming = files;
      if (files.length > remaining) {
        toast.warning(
          `You can upload up to ${MAX_PDFS} PDFs at once. Added the first ${remaining}, skipped ${files.length - remaining}.`,
        );
        incoming = files.slice(0, remaining);
      }

      const items = incoming.map(buildItem);
      addFiles(items);
      for (const item of items) void loadMetadata(item);
    },
    [addFiles, loadMetadata, currentCount],
  );

  return (
    <Dropzone
      accept={PDF_ACCEPT}
      multiple
      onFiles={onFiles}
      label="Drop PDF files here"
      hint="Click to browse — multiple files supported"
      icon={<FileText className="h-8 w-8" />}
    />
  );
}