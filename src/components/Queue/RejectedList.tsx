// RejectedList: a collapsible table of PDFs that were not accepted into the
// queue (e.g. they would exceed the MAX_PDFS limit). Each row can be added
// back to the main queue (if there's room) or dismissed.
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  FileX,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/store/useAppStore";
import { usePdfIngest } from "@/hooks/usePdfIngest";
import { formatBytes } from "@/utils/pdf";
import { MAX_PDFS, type RejectedFile } from "@/types";
import { toast } from "sonner";

export function RejectedList() {
  const rejectedFiles = useAppStore((state) => state.rejectedFiles);
  const removeRejected = useAppStore((state) => state.removeRejected);
  const clearRejected = useAppStore((state) => state.clearRejected);
  const { roomLeft, ingest } = usePdfIngest();

  const [open, setOpen] = useState(true);

  if (rejectedFiles.length === 0) return null;

  const restoreOne = (item: RejectedFile): void => {
    if (roomLeft() <= 0) {
      toast.warning(
        `Queue is full (${MAX_PDFS} PDFs). Remove a file before adding this one.`,
      );
      return;
    }
    ingest([item.file]);
    removeRejected(item.id);
    toast.success(`"${item.name}" added to the queue.`);
  };

  const restoreAll = (): void => {
    const room = roomLeft();
    if (room <= 0) {
      toast.warning(
        `Queue is full (${MAX_PDFS} PDFs). Remove some files before adding more.`,
      );
      return;
    }
    const toRestore = rejectedFiles.slice(0, room);
    ingest(toRestore.map((f) => f.file));
    for (const f of toRestore) removeRejected(f.id);

    const leftover = rejectedFiles.length - toRestore.length;
    toast.success(
      leftover > 0
        ? `Added ${toRestore.length} to the queue. ${leftover} still rejected (limit reached).`
        : `Added ${toRestore.length} file${toRestore.length === 1 ? "" : "s"} to the queue.`,
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex min-w-0 items-center gap-2"
          aria-expanded={open}
        >
          <span className="grid size-7 place-items-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
            <FileX className="h-3.5 w-3.5" />
          </span>
          <h3 className="text-sm font-semibold">
            Rejected files
            <span className="ml-1.5 text-xs font-normal text-muted-foreground">
              ({rejectedFiles.length})
            </span>
          </h3>
          <ChevronDown
            className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
        <div className="flex shrink-0 items-center gap-1">
          <Button variant="outline" size="sm" onClick={restoreAll}>
            <Upload className="mr-1 h-3.5 w-3.5" /> Add all
          </Button>
          <Button variant="ghost" size="sm" onClick={clearRejected}>
            <Trash2 className="mr-1 h-3.5 w-3.5" /> Clear
          </Button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="overflow-hidden rounded-2xl border border-border/60">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 font-medium">Size</th>
                    <th className="px-3 py-2 font-medium">Reason</th>
                    <th className="w-20 px-3 py-2 text-right font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rejectedFiles.map((file) => (
                    <tr
                      key={file.id}
                      className="border-b border-border/40 last:border-0 hover:bg-muted/30"
                    >
                      <td className="max-w-0 px-3 py-2">
                        <p
                          className="truncate font-medium text-foreground"
                          title={file.name}
                        >
                          {file.name}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                        {formatBytes(file.size)}
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant="warning">{file.reason}</Badge>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-end gap-0.5">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => restoreOne(file)}
                            title="Add to queue"
                          >
                            <Plus />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => removeRejected(file.id)}
                            title="Dismiss"
                          >
                            <X />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
