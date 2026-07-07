// PdfDropzone: drop one or more PDFs. Accepts up to the MAX_PDFS cap and
// records any overflow in the rejected list (via the shared ingest hook).
import { useCallback } from "react";
import { FileText } from "lucide-react";
import { Dropzone } from "@/components/UploadArea/Dropzone";
import { useAppStore } from "@/store/useAppStore";
import { usePdfIngest } from "@/hooks/usePdfIngest";
import { uid } from "@/utils/pdf";
import { MAX_PDFS } from "@/types";
import { toast } from "sonner";

const PDF_ACCEPT = {
  "application/pdf": [".pdf"],
} as const;

export function PdfDropzone() {
  const addRejected = useAppStore((state) => state.addRejected);
  const { roomLeft, ingest } = usePdfIngest();

  const onFiles = useCallback(
    (files: File[]): void => {
      // Read the live count so rapid, successive drops can't slip past the cap.
      const remaining = roomLeft();

      const accepted = files.slice(0, remaining);
      const rejected = files.slice(remaining);

      if (rejected.length > 0) {
        addRejected(
          rejected.map((file) => ({
            id: uid(),
            file,
            name: file.name,
            size: file.size,
            reason: `Exceeds the ${MAX_PDFS}-PDF limit`,
          })),
        );
        toast.warning(
          accepted.length > 0
            ? `You can keep up to ${MAX_PDFS} PDFs at a time. Added ${accepted.length}, rejected ${rejected.length}.`
            : `You've reached the ${MAX_PDFS}-PDF limit. ${rejected.length} file${rejected.length === 1 ? "" : "s"} rejected — remove some before adding more.`,
        );
      }

      ingest(accepted);
    },
    [addRejected, ingest, roomLeft],
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
