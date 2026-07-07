// Toolbar: top-level actions — Replace, Cancel, Download ZIP, Export Report.
import { useCallback, useState } from "react";
import {
  Download,
  FileBox,
  FileJson,
  Loader2,
  Play,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/useAppStore";
import { buildZip, downloadZip, type ZipItem } from "@/services/zipGenerator";
import { downloadBlob } from "@/utils/pdf";
import { toast } from "sonner";
import { ReportDialog } from "@/components/Queue/ReportDialog";
import type { UseBulkQueue } from "@/hooks/useBulkQueue";

export interface ToolbarProps {
  bulk: UseBulkQueue;
}

export function Toolbar({ bulk }: ToolbarProps) {
  const files = useAppStore((state) => state.files);
  const newLogo = useAppStore((state) => state.newLogo);
  const replacementMarksByFile = useAppStore((state) => state.replacementMarksByFile);
  const hasMarkedPages = Object.values(replacementMarksByFile).some(
    (pages) => Object.keys(pages).length > 0,
  );
  const report = useAppStore((state) => state.report);
  const isProcessing = useAppStore((state) => state.isProcessing);
  const [zipping, setZipping] = useState<boolean>(false);
  const [reportOpen, setReportOpen] = useState<boolean>(false);

  const canReplace =
    files.length > 0 &&
    newLogo != null &&
    hasMarkedPages &&
    !isProcessing;
  const processedFiles = files.filter((f) => f.status === "processed");
  const canDownload = processedFiles.length > 0 && !zipping;
  const canExport = report.length > 0;

  const onReplace = useCallback(async (): Promise<void> => {
    if (!newLogo) {
      toast.error("Upload a new logo first.");
      return;
    }
    if (!hasMarkedPages) {
      toast.error("Drag on the preview to mark which pages to replace.");
      return;
    }
    if (files.length === 0) {
      toast.error("Add at least one PDF.");
      return;
    }
    await bulk.start();
  }, [bulk, files.length, newLogo, hasMarkedPages]);

  const onCancel = useCallback((): void => {
    bulk.cancel();
  }, [bulk]);

  const onDownloadZip = useCallback(async (): Promise<void> => {
    if (processedFiles.length === 0) return;
    setZipping(true);
    try {
      const items: ZipItem[] = [];
      for (const f of processedFiles) {
        if (!f.resultBlobUrl) continue;
        const resp = await fetch(f.resultBlobUrl);
        const blob = await resp.blob();
        items.push({ name: f.name, blob });
      }
      if (items.length === 0) {
        toast.error("No processed PDFs to download.");
        return;
      }
      const blob = await buildZip(items);
      downloadZip(blob);
      toast.success(`Zipped ${items.length} file${items.length === 1 ? "" : "s"}.`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(`ZIP failed: ${message}`);
    } finally {
      setZipping(false);
    }
  }, [processedFiles]);

  const onExportReport = useCallback((): void => {
    if (report.length === 0) return;
    const payload = {
      generatedAt: new Date().toISOString(),
      items: report,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    downloadBlob(blob, "report.json");
    toast.success("Report exported.");
  }, [report]);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/60 bg-card/80 p-2 shadow-[0_1px_2px_hsl(var(--foreground)/0.04),0_8px_24px_-12px_hsl(var(--foreground)/0.08)] backdrop-blur-sm">
        {isProcessing ? (
          <Button variant="destructive" size="sm" onClick={onCancel}>
            <X className="mr-1 h-3.5 w-3.5" /> Cancel
          </Button>
        ) : (
          <Button onClick={() => void onReplace()} disabled={!canReplace} size="sm">
            <Play className="mr-1 h-3.5 w-3.5 fill-current" /> Replace logos
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => void onDownloadZip()}
          disabled={!canDownload}
        >
          {zipping ? (
            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
          ) : (
            <FileBox className="mr-1 h-3.5 w-3.5" />
          )}
          Download ZIP
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onExportReport}
          disabled={!canExport}
        >
          <FileJson className="mr-1 h-3.5 w-3.5" /> Export Report
        </Button>
        {report.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setReportOpen(true)}
            className="ml-auto"
          >
            <Download className="mr-1 h-3.5 w-3.5" /> View report
          </Button>
        )}
      </div>
      <ReportDialog open={reportOpen} onOpenChange={setReportOpen} onExport={onExportReport} />
    </>
  );
}