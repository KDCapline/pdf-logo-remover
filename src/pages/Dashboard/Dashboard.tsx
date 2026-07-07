// Dashboard: top-level page composing every feature component in a
// responsive grid. Owns the single useBulkQueue instance. The Help dialog
// is rendered separately via <HelpDialog/> and controlled by the store.
import { useEffect, useMemo } from "react";
import { Eraser, FileText, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/Theme/ThemeToggle";
import { HelpDialog } from "@/components/Help/HelpDialog";
import { PdfDropzone } from "@/components/UploadArea/PdfDropzone";
import { LogoUploader } from "@/components/LogoUploader/LogoUploader";
import { SettingsPanel } from "@/components/Settings/SettingsPanel";
import { Toolbar } from "@/components/Toolbar/Toolbar";
import { BulkProgress, useBulkProgressController } from "@/components/Progress/BulkProgress";
import { PdfPreview } from "@/components/PDFPreview/PdfPreview";
import { FileList } from "@/components/Queue/FileList";
import { RejectedList } from "@/components/Queue/RejectedList";
import { useAppStore } from "@/store/useAppStore";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export function Dashboard() {
  const bulk = useBulkProgressController();
  const files = useAppStore((state) => state.files);
  const rejectedCount = useAppStore((state) => state.rejectedFiles.length);
  const selectedFileId = useAppStore((state) => state.selectedFileId);
  const setSelectedFileId = useAppStore((state) => state.setSelectedFileId);
  const setHelpOpen = useAppStore((state) => state.setHelpOpen);
  const replacementMarksByFile = useAppStore((state) => state.replacementMarksByFile);
  const clearReplacementMarks = useAppStore((state) => state.clearReplacementMarks);
  const previewPageById = useAppStore((state) => state.previewPageById);

  useEffect(() => {
    if (selectedFileId == null && files.length > 0) {
      setSelectedFileId(files[0].id);
    }
    if (selectedFileId != null && !files.some((f) => f.id === selectedFileId)) {
      setSelectedFileId(files.length > 0 ? files[0].id : null);
    }
  }, [files, selectedFileId, setSelectedFileId]);

  const selectedItem = useMemo(
    () => files.find((f) => f.id === selectedFileId) ?? null,
    [files, selectedFileId],
  );

  const activeFileId = selectedItem?.id ?? null;

  const markedPageEntries = useMemo(
    () => {
      const fileMarks =
        activeFileId != null
          ? (replacementMarksByFile[activeFileId] ?? {})
          : {};
      return Object.entries(fileMarks)
        .map(([page, mark]) => ({
          pageIndex: Number.parseInt(page, 10),
          rect: mark.rect,
        }))
        .filter((entry) => Number.isFinite(entry.pageIndex))
        .sort((a, b) => a.pageIndex - b.pageIndex);
    },
    [replacementMarksByFile, activeFileId],
  );

  const currentPreviewPage =
    activeFileId != null
      ? (previewPageById[activeFileId] ?? 0)
      : null;
  const currentPageRect =
    currentPreviewPage != null && activeFileId != null
      ? (replacementMarksByFile[activeFileId] ?? {})[currentPreviewPage]?.rect
      : null;

  return (
    <div className="flex min-h-screen flex-col text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/40 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-[0_4px_14px_-4px_hsl(var(--primary)/0.45)]">
                <FileText className="h-5 w-5" strokeWidth={2.25} />
              </div>
            </div>
            <div className="flex flex-col leading-none">
              <h1 className="text-base font-semibold tracking-tight sm:text-lg">
                PDF Logo Replacer
              </h1>
              <span className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Local · Private · Fast
              </span>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setHelpOpen(true)}
            >
              <HelpCircle className="mr-1 h-3.5 w-3.5" /> Help
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,420px),1fr] lg:gap-6">
          <section className="flex flex-col gap-5">
            <Card>
              <CardContent className="p-4">
                <PdfDropzone />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-5 p-5">
                <LogoUploader />
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="grid size-7 place-items-center rounded-full bg-accent/15 text-accent">
                        <Eraser className="h-3.5 w-3.5" />
                      </span>
                      <h3 className="text-sm font-semibold">
                        Replacement area
                      </h3>
                    </div>
                    {markedPageEntries.length > 0 && selectedItem != null && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => clearReplacementMarks(selectedItem.id)}
                      >
                        <Eraser className="mr-1 h-3.5 w-3.5" /> Clear marks
                      </Button>
                    )}
                  </div>
                  {markedPageEntries.length > 0 ? (
                    <div className="space-y-2">
                      <div className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5 px-3.5 py-2.5">
                        <p className="text-xs text-muted-foreground">
                          Marked on {markedPageEntries.length} page
                          {markedPageEntries.length === 1 ? "" : "s"}:{" "}
                          {markedPageEntries.map((e) => e.pageIndex + 1).join(", ")}
                        </p>
                        {currentPageRect && currentPreviewPage != null ? (
                          <p className="mt-1 font-mono text-sm tabular-nums text-foreground">
                            Page {currentPreviewPage + 1}:{" "}
                            {Math.round(currentPageRect.x)},{" "}
                            {Math.round(currentPageRect.y)} ·{" "}
                            {Math.round(currentPageRect.width)}×
                            {Math.round(currentPageRect.height)}
                          </p>
                        ) : currentPreviewPage != null ? (
                          <p className="mt-1 text-sm text-muted-foreground">
                            Page {currentPreviewPage + 1} is not marked yet.
                          </p>
                        ) : null}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Marks are per-PDF — switch files in the preview to mark each one separately.
                      </p>
                    </div>
                  ) : (
                    <p className="rounded-xl bg-muted/40 px-3.5 py-2.5 text-sm text-muted-foreground">
                      Drag on the preview to mark where the new logo goes.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <SettingsPanel />

            <div className="space-y-3">
              <Toolbar bulk={bulk} />
              <BulkProgress bulk={bulk} />
            </div>

            {rejectedCount > 0 && (
              <Card>
                <CardContent className="p-5">
                  <RejectedList />
                </CardContent>
              </Card>
            )}
          </section>

          <section className="flex min-h-0 flex-col gap-5">
            <Card className="flex min-h-0 flex-1 flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Preview</CardTitle>
                  <span className="text-xs text-muted-foreground">
                    {selectedItem
                      ? `${selectedItem.name} · ${selectedItem.pageCount} pages`
                      : "No file selected"}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="min-h-0 flex-1 p-5 pt-0">
                {selectedItem ? (
                  <div className="h-[60vh] min-h-[420px]">
                    <PdfPreview item={selectedItem} />
                  </div>
                ) : (
                  <div className="flex h-[60vh] min-h-[420px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed bg-muted/30 text-center">
                    <span className="grid size-12 place-items-center rounded-2xl bg-card text-muted-foreground shadow-sm">
                      <FileText className="h-6 w-6" />
                    </span>
                    <div>
                      <p className="text-sm font-medium">
                        No PDF selected
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Drop a PDF into the upload area to preview it here.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Files</CardTitle>
                  <span className="text-xs text-muted-foreground">
                    {files.length} total
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                <FileList />
              </CardContent>
            </Card>
          </section>
        </div>
      </main>

      <HelpDialog />
    </div>
  );
}