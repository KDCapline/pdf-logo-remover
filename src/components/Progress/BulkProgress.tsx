// BulkProgress: shown while isProcessing. Reads useBulkQueue.progress plus
// store for cancel/elapsed/remaining.
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAppStore } from "@/store/useAppStore";
import { useBulkQueue } from "@/hooks/useBulkQueue";
import { usePDFProcessor } from "@/hooks/usePDFProcessor";
import { formatDuration } from "@/utils/pdf";
import { Loader2, X } from "lucide-react";

export interface BulkProgressProps {
  bulk: ReturnType<typeof useBulkQueue>;
}

export function BulkProgress({ bulk }: BulkProgressProps) {
  const isProcessing = useAppStore((state) => state.isProcessing);
  const { progress } = bulk;

  if (!isProcessing) {
    return null;
  }

  const total = progress.total || 0;
  const done = progress.done || 0;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-sm font-medium">
            <span className="grid size-7 place-items-center rounded-full bg-primary/15 text-primary">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            </span>
            Processing
          </div>
          <Button variant="outline" size="sm" onClick={() => bulk.cancel()}>
            <X className="mr-1 h-3.5 w-3.5" /> Cancel
          </Button>
        </div>
        <div className="space-y-1.5">
          <Progress value={pct} />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              {done}/{total} done · {progress.remaining} remaining ·{" "}
              {progress.active} active
            </span>
            <span className="tabular-nums">{formatDuration(progress.elapsedMs)}</span>
          </div>
        </div>
        {progress.currentName && (
          <p className="truncate rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            Current: <span className="font-medium text-foreground">{progress.currentName}</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function useBulkProgressController(): ReturnType<typeof useBulkQueue> {
  const { processFile } = usePDFProcessor();
  return useBulkQueue(processFile);
}