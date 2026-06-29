// ReportDialog: modal listing all report items with status icons, reasons,
// and durations. "Export" triggers the same export callback used by the toolbar.
import {
  CircleAlert,
  CircleCheck,
  CircleX,
  FileJson,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/useAppStore";
import { formatDuration } from "@/utils/pdf";
import type { ReportItem } from "@/types";

export interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: () => void;
}

function iconFor(status: ReportItem["status"]) {
  if (status === "processed")
    return <CircleCheck className="h-4 w-4 text-emerald-500" />;
  if (status === "skipped")
    return <CircleAlert className="h-4 w-4 text-amber-500" />;
  return <CircleX className="h-4 w-4 text-destructive" />;
}

export function ReportDialog({
  open,
  onOpenChange,
  onExport,
}: ReportDialogProps) {
  const report = useAppStore((state) => state.report);
  const clearReport = useAppStore((state) => state.clearReport);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Processing report</DialogTitle>
          <DialogDescription>
            {report.length} item{report.length === 1 ? "" : "s"} in this run.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-auto rounded-xl border border-border/60">
          {report.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              No items yet.
            </p>
          ) : (
            <ul className="divide-y divide-border/60">
              {report.map((item, idx) => (
                <li
                  key={`${item.name}-${idx}`}
                  className="flex items-start gap-3 p-3.5"
                >
                  <div className="mt-0.5">{iconFor(item.status)}</div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      <span className="capitalize">{item.status}</span>
                      {item.reason ? ` · ${item.reason}` : ""}
                      {item.durationMs != null
                        ? ` · ${formatDuration(item.durationMs)}`
                        : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={clearReport}
            disabled={report.length === 0}
          >
            Clear
          </Button>
          <Button onClick={onExport} disabled={report.length === 0}>
            <FileJson className="mr-1 h-3.5 w-3.5" /> Export
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}