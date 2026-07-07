// useBulkQueue: orchestrates concurrent processing of the file queue.
// Wraps usePDFProcessor.processFile with a createConcurrentQueue and
// tracks progress / cancellation.
import { useCallback, useRef, useState } from "react";
import type { PDFFileItem, ProcessingSettings, ReportItem } from "@/types";
import { createConcurrentQueue, type QueueHandle } from "@/utils/queue";
import { useAppStore } from "@/store/useAppStore";
import { usePDFProcessor } from "@/hooks/usePDFProcessor";

export interface BulkProgress {
  done: number;
  total: number;
  active: number;
  currentName: string | null;
  elapsedMs: number;
  remaining: number;
}

export interface UseBulkQueue {
  start: () => Promise<void>;
  cancel: () => void;
  isProcessing: boolean;
  progress: BulkProgress;
}

const EMPTY_PROGRESS: BulkProgress = {
  done: 0,
  total: 0,
  active: 0,
  currentName: null,
  elapsedMs: 0,
  remaining: 0,
};

interface RunContext {
  queue: QueueHandle;
  startTime: number;
  total: number;
  done: number;
  active: number;
  currentName: string | null;
  started: Set<string>;
  tickHandle: number | null;
}

export function useBulkQueue(
  processFile: ReturnType<typeof usePDFProcessor>["processFile"],
): UseBulkQueue {
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<BulkProgress>(EMPTY_PROGRESS);

  const ctxRef = useRef<RunContext | null>(null);

  const flushProgress = useCallback((ctx: RunContext): void => {
    const elapsedMs = Date.now() - ctx.startTime;
    setProgress({
      done: ctx.done,
      total: ctx.total,
      active: ctx.active,
      currentName: ctx.currentName,
      elapsedMs,
      remaining: Math.max(0, ctx.total - ctx.done),
    });
  }, []);

  const start = useCallback(async (): Promise<void> => {
    if (ctxRef.current) return;

    const store = useAppStore.getState();
    const settings: ProcessingSettings = store.settings;
    const newLogo = store.newLogo;
    const replacementRectsByPage = store.replacementRectsByPage;

    if (!newLogo || Object.keys(replacementRectsByPage).length === 0) {
      return;
    }

    // Build the work list: pending/queued files plus, when retryFailed is set,
    // previously errored files.
    const retryFailed = store.retryFailed;
    const list = store.files.filter((f) => {
      if (f.status === "pending" || f.status === "queued") return true;
      if (retryFailed && f.status === "error") return true;
      return false;
    });

    if (list.length === 0) {
      return;
    }

    // Mark each file queued for processing as "processing" up-front so the UI
    // reflects the imminent work.
    for (const item of list) {
      store.setFileStatus(item.id, "processing");
      store.updateFile(item.id, { progress: 0, currentPage: 0 });
    }

    const ctx: RunContext = {
      queue: createConcurrentQueue(settings.concurrency),
      startTime: Date.now(),
      total: list.length,
      done: 0,
      active: 0,
      currentName: null,
      started: new Set<string>(),
      tickHandle: null,
    };
    ctxRef.current = ctx;

    ctx.queue.onProgress = (done, _total, active) => {
      ctx.done = done;
      ctx.active = active;
      flushProgress(ctx);
    };

    setIsProcessing(true);
    store.startProcessing();
    setProgress({
      ...EMPTY_PROGRESS,
      total: list.length,
      remaining: list.length,
    });

    // Tick the elapsed-time display ~4x/sec while work is in flight.
    ctx.tickHandle = window.setInterval(() => {
      flushProgress(ctx);
    }, 250);

    const signal = {
      get canceled(): boolean {
        return useAppStore.getState().cancelRequested;
      },
    };

    let resolveAll: () => void = () => {};
    const allDone = new Promise<void>((resolve) => {
      resolveAll = resolve;
    });

    const onItemFinished = (item: PDFFileItem, report: ReportItem): void => {
      ctx.currentName = item.name;
      const currentStore = useAppStore.getState();
      if (report.status === "error" && report.reason === "canceled") {
        currentStore.setFileStatus(item.id, "canceled");
      } else if (
        report.status === "error" &&
        currentStore.files.find((f) => f.id === item.id)?.status === "canceled"
      ) {
        // Already marked canceled via cancel(); leave the status alone.
      } else {
        currentStore.setFileStatus(item.id, report.status);
      }
      currentStore.addReport(report);
    };

    for (const item of list) {
      const runner = async (): Promise<void> => {
        ctx.started.add(item.id);
        ctx.currentName = item.name;
        // Short-circuit if the queue was canceled before this runner started.
        if (useAppStore.getState().cancelRequested) {
          onItemFinished(item, {
            name: item.name,
            status: "error",
            reason: "canceled",
          });
          return;
        }
        try {
          const report = await processFile(
            item,
            newLogo,
            replacementRectsByPage,
            signal,
          );
          onItemFinished(item, report);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          onItemFinished(item, {
            name: item.name,
            status: "error",
            reason: message,
          });
        }
      };
      ctx.queue.add(runner);
    }

    void ctx.queue.wait().then(() => {
      if (ctx.tickHandle !== null) {
        window.clearInterval(ctx.tickHandle);
        ctx.tickHandle = null;
      }
      ctxRef.current = null;
      setIsProcessing(false);
      useAppStore.getState().resetCancel();
      flushProgress(ctx);
      resolveAll();
    });

    await allDone;
  }, [processFile, flushProgress]);

  const cancel = useCallback((): void => {
    const store = useAppStore.getState();
    const ctx = ctxRef.current;
    store.cancelProcessing();
    if (ctx) {
      ctx.queue.cancel();
      // Any file in our list that hasn't actually started running should be
      // marked canceled immediately. Running files will report "canceled"
      // through their processFile signal and be marked in onItemFinished.
      for (const f of store.files) {
        if (
          (f.status === "processing" ||
            f.status === "queued" ||
            f.status === "pending") &&
          !ctx.started.has(f.id)
        ) {
          store.setFileStatus(f.id, "canceled");
          store.addReport({
            name: f.name,
            status: "error",
            reason: "canceled",
          });
          ctx.done++;
        }
      }
      flushProgress(ctx);
    }
  }, [flushProgress]);

  return { start, cancel, isProcessing, progress };
}