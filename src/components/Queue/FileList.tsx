// FileList: queue of PDFFileItem rows with drag-to-reorder, search filter,
// per-row status badge, progress bar, remove, clear all, retry, click to
// select.
import { useMemo, useState, type DragEvent } from "react";
import {
  CheckCircle,
  CircleAlert,
  CircleX,
  Download,
  FileText,
  GripVertical,
  Loader2,
  RotateCcw,
  Search,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAppStore } from "@/store/useAppStore";
import { downloadBlob, formatBytes } from "@/utils/pdf";
import type { FileStatus, PDFFileItem } from "@/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type StatusVariant = NonNullable<BadgeProps["variant"]>;

function StatusBadge({ status }: { status: FileStatus }) {
  const map: Record<FileStatus, { label: string; variant: StatusVariant }> = {
    pending: { label: "Pending", variant: "outline" },
    queued: { label: "Queued", variant: "outline" },
    processing: { label: "Processing", variant: "default" },
    processed: { label: "Done", variant: "success" },
    skipped: { label: "Skipped", variant: "warning" },
    error: { label: "Error", variant: "destructive" },
    canceled: { label: "Canceled", variant: "outline" },
  };
  const meta = map[status];
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

function StatusIcon({ status }: { status: FileStatus }) {
  switch (status) {
    case "processed":
      return <CheckCircle className="h-4 w-4 text-emerald-500" />;
    case "processing":
    case "queued":
      return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
    case "error":
      return <CircleX className="h-4 w-4 text-destructive" />;
    case "canceled":
      return <TriangleAlert className="h-4 w-4 text-muted-foreground" />;
    case "skipped":
      return <CircleAlert className="h-4 w-4 text-amber-500" />;
    default:
      return <FileText className="h-4 w-4 text-muted-foreground" />;
  }
}

interface RowProps {
  item: PDFFileItem;
  selected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onRetry: () => void;
  onDownload: () => void;
  onDragStart: (e: DragEvent<HTMLDivElement>) => void;
  onDragOver: (e: DragEvent<HTMLDivElement>) => void;
  onDrop: (e: DragEvent<HTMLDivElement>) => void;
  onDragEnd: (e: DragEvent<HTMLDivElement>) => void;
  dragging: boolean;
  dragOver: boolean;
}

function Row({
  item,
  selected,
  onSelect,
  onRemove,
  onRetry,
  onDownload,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  dragging,
  dragOver,
}: RowProps) {
  const loading = item.pageCount === 0 && item.status !== "error";
  const showRetry = item.status === "error" || item.status === "skipped";
  const canDownload = item.status === "processed" && !!item.resultBlobUrl;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      onClick={onSelect}
      className={cn(
        "group flex cursor-pointer items-center gap-3 rounded-2xl border border-transparent bg-card p-3 transition-all hover:border-border/60 hover:bg-accent/40",
        selected &&
          "border-primary/40 bg-primary/5 shadow-[0_4px_14px_-6px_hsl(var(--primary)/0.25)]",
        dragging && "opacity-60",
        dragOver && "border-primary bg-primary/5",
      )}
    >
      <div className="cursor-grab text-muted-foreground transition-colors hover:text-foreground" aria-hidden>
        <GripVertical className="h-4 w-4" />
      </div>
      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-border/60 bg-muted shadow-sm">
        {item.thumbnailUrl ? (
          <img
            src={item.thumbnailUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <FileText className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium">{item.name}</p>
          <StatusIcon status={item.status} />
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>{formatBytes(item.size)}</span>
          <span>
            {loading
              ? "Reading…"
              : `${item.pageCount} page${item.pageCount === 1 ? "" : "s"}`}
          </span>
          <StatusBadge status={item.status} />
        </div>
        {item.status === "processing" && (
          <div className="mt-2">
            <Progress value={item.progress} className="h-1.5" />
          </div>
        )}
        {item.status === "error" && item.error && (
          <p className="mt-1 truncate text-xs text-destructive">{item.error}</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-0.5 opacity-70 transition-opacity group-hover:opacity-100">
        {showRetry && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={(e) => {
              e.stopPropagation();
              onRetry();
            }}
            title="Retry"
          >
            <RotateCcw />
          </Button>
        )}
        {canDownload && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={(e) => {
              e.stopPropagation();
              onDownload();
            }}
            title="Download PDF"
          >
            <Download />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          title="Remove"
        >
          <Trash2 />
        </Button>
      </div>
    </div>
  );
}

export function FileList() {
  const files = useAppStore((state) => state.files);
  const setFiles = useAppStore((state) => state.setFiles);
  const removeFile = useAppStore((state) => state.removeFile);
  const clearFiles = useAppStore((state) => state.clearFiles);
  const updateFile = useAppStore((state) => state.updateFile);
  const setFileStatus = useAppStore((state) => state.setFileStatus);
  const selectedFileId = useAppStore((state) => state.selectedFileId);
  const setSelectedFileId = useAppStore((state) => state.setSelectedFileId);

  const [query, setQuery] = useState<string>("");
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return files;
    return files.filter((f) => f.name.toLowerCase().includes(q));
  }, [files, query]);

  const reorder = (fromId: string, toId: string): void => {
    if (fromId === toId) return;
    const next = [...files];
    const fromIdx = next.findIndex((f) => f.id === fromId);
    const toIdx = next.findIndex((f) => f.id === toId);
    if (fromIdx === -1 || toIdx === -1) return;
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    setFiles(next);
  };

  const handleDragStart = (id: string) => (e: DragEvent<HTMLDivElement>) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  };
  const handleDragOver = (id: string) => (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (overId !== id) setOverId(id);
  };
  const handleDrop = (id: string) => (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const source = dragId ?? e.dataTransfer.getData("text/plain");
    if (source) reorder(source, id);
    setDragId(null);
    setOverId(null);
  };
  const handleDragEnd = () => {
    setDragId(null);
    setOverId(null);
  };

  const handleRetry = (item: PDFFileItem): void => {
    setFileStatus(item.id, "pending");
    updateFile(item.id, { progress: 0, error: undefined, reason: undefined });
  };

  const handleDownload = async (item: PDFFileItem): Promise<void> => {
    if (!item.resultBlobUrl) {
      toast.error("This file hasn't been processed yet.");
      return;
    }
    try {
      const resp = await fetch(item.resultBlobUrl);
      const blob = await resp.blob();
      downloadBlob(blob, item.name);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(`Download failed: ${message}`);
    }
  };

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search files…"
            className="pl-9"
          />
        </div>
        {files.length > 0 && (
          <Button variant="outline" size="sm" onClick={clearFiles}>
            <Trash2 className="mr-1 h-3.5 w-3.5" /> Clear All
          </Button>
        )}
      </div>
      {files.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-muted/30 p-10 text-center">
          <p className="text-sm font-medium text-foreground">No PDFs yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Drop files into the upload area above to get started.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          No files match "{query}".
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => (
            <Row
              key={item.id}
              item={item}
              selected={item.id === selectedFileId}
              onSelect={() => setSelectedFileId(item.id)}
              onRemove={() => removeFile(item.id)}
              onRetry={() => handleRetry(item)}
              onDownload={() => void handleDownload(item)}
              onDragStart={handleDragStart(item.id)}
              onDragOver={handleDragOver(item.id)}
              onDrop={handleDrop(item.id)}
              onDragEnd={handleDragEnd}
              dragging={dragId === item.id}
              dragOver={overId === item.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}