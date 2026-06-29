// PdfPreview: renders the selected file's current page into a canvas with
// an overlay showing the single global replacement rect (blue). Supports
// zoom, fit-width, page navigation, keyboard shortcuts, and drag-to-edit
// the rect (create / move / resize).
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  ChevronLeft,
  ChevronRight,
  Maximize,
  Minus,
  Plus,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/store/useAppStore";
import { usePDFProcessor, type PreviewHandle } from "@/hooks/usePDFProcessor";
import type { PDFFileItem, Rectangle } from "@/types";
import { cn } from "@/lib/utils";

function drawRect(
  canvas: HTMLCanvasElement,
  r: Rectangle,
  color: string,
  lineWidth: number,
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.strokeRect(r.x, r.y, r.width, r.height);
  ctx.restore();
}

export interface PdfPreviewProps {
  item: PDFFileItem;
}

type DragMode = "move" | "resize" | "create";

interface DragState {
  mode: DragMode;
  startPointerX: number;
  startPointerY: number;
  startRect: Rectangle;
}

const HANDLE_SIZE = 12; // CSS px hit target for the resize handle
const ZOOM_FACTOR = 1.25;

function pointInRect(px: number, py: number, r: Rectangle): boolean {
  return (
    px >= r.x &&
    px <= r.x + r.width &&
    py >= r.y &&
    py <= r.y + r.height
  );
}

function pointInHandle(px: number, py: number, r: Rectangle): boolean {
  const hx = r.x + r.width;
  const hy = r.y + r.height;
  return (
    px >= hx - HANDLE_SIZE &&
    px <= hx + HANDLE_SIZE &&
    py >= hy - HANDLE_SIZE &&
    py <= hy + HANDLE_SIZE
  );
}

export function PdfPreview({ item }: PdfPreviewProps) {
  const replacementRect = useAppStore((state) => state.replacementRect);
  const setReplacementRect = useAppStore((state) => state.setReplacementRect);
  const { renderPageForPreview } = usePDFProcessor();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const naturalSizeRef = useRef<{ width: number; height: number } | null>(null);
  const dragRef = useRef<DragState | null>(null);
  // Auto-fit the page to the container once per file. Resets when the file
  // changes so switching PDFs re-fits instead of inheriting the prior zoom.
  const autoFitRef = useRef<boolean>(false);
  const [pageInput, setPageInput] = useState<string>("1");

  const pageIndex = useAppStore((state) => state.previewPageById[item.id] ?? 0);
  const setPreviewPage = useAppStore((state) => state.setPreviewPage);
  const setPageIndex = useCallback(
    (next: number | ((prev: number) => number)): void => {
      const current = useAppStore.getState().previewPageById[item.id] ?? 0;
      setPreviewPage(
        item.id,
        typeof next === "function" ? next(current) : next,
      );
    },
    [item.id, setPreviewPage],
  );
  const [zoom, setZoom] = useState<number>(1.5);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [draftRect, setDraftRect] = useState<Rectangle | null>(null);

  const pageCount = Math.max(1, item.pageCount);

  // Initialize page input on mount / when the page index changes externally.
  useEffect(() => {
    setPageInput(String(pageIndex + 1));
  }, [pageIndex]);

  // Clamp page index when pageCount becomes known.
  useEffect(() => {
    if (pageIndex > pageCount - 1) {
      const next = Math.max(0, pageCount - 1);
      setPageIndex(next);
      setPageInput(String(next + 1));
    }
  }, [pageCount, pageIndex]);

  // Reset the auto-fit flag whenever the file changes so the new PDF gets
  // fit-to-container on its first render instead of inheriting the old zoom.
  useEffect(() => {
    autoFitRef.current = false;
  }, [item.file]);

  // Render PDF page on file/page/zoom change.
  useEffect(() => {
    let cancelled = false;
    void (async (): Promise<void> => {
      try {
        const handle: PreviewHandle = await renderPageForPreview(
          item.file,
          pageIndex,
          zoom,
        );
        if (cancelled) {
          handle.cleanup();
          return;
        }
        const container = containerRef.current;
        if (!container) {
          handle.cleanup();
          return;
        }
        if (canvasRef.current) {
          canvasRef.current.remove();
          canvasRef.current = null;
        }
        if (cleanupRef.current) {
          cleanupRef.current();
          cleanupRef.current = null;
        }
        handle.canvas.className = "block max-w-full h-auto";
        // Remove the previous canvas if any, then place the new one inside the
        // wrapper that already hosts the overlay.
        const wrapper = wrapperRef.current;
        if (wrapper) {
          const old = wrapper.querySelector<HTMLCanvasElement>("canvas.pdf-canvas");
          if (old) old.remove();
          wrapper.insertBefore(handle.canvas, overlayRef.current ?? null);
        }
        canvasRef.current = handle.canvas;
        if (overlayRef.current) {
          overlayRef.current.width = handle.canvas.width;
          overlayRef.current.height = handle.canvas.height;
        }
        naturalSizeRef.current = {
          width: handle.canvas.width / zoom,
          height: handle.canvas.height / zoom,
        };
        cleanupRef.current = handle.cleanup;

        // On the first render of a file, fit the page width to the container
        // so text is readable and vertical scrolling reveals the rest. Subsequent
        // zoom changes (user-driven) leave zoom alone.
        if (!autoFitRef.current) {
          const natural = naturalSizeRef.current;
          const cw = container.clientWidth;
          if (natural && cw > 0) {
            const padding = 16; // match the p-2 on the container
            const availW = Math.max(1, cw - padding * 2);
            const fit = availW / natural.width;
            if (Number.isFinite(fit) && fit > 0) {
              autoFitRef.current = true;
              setZoom(fit);
            }
          }
        }
      } catch {
        /* ignore render errors — preview is best-effort */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [item.file, pageIndex, zoom, renderPageForPreview]);

  // Track container width for fit-width.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // draftRect (in-progress drag) takes priority so the user sees live updates;
  // otherwise show the single global replacement rect (same on every page).
  const effectiveRect: Rectangle | null = draftRect ?? replacementRect ?? null;

  // Convert a rect from PDF units (scale=1) to canvas pixels at current zoom.
  const toCanvas = useCallback(
    (r: Rectangle): Rectangle => ({
      x: r.x * zoom,
      y: r.y * zoom,
      width: r.width * zoom,
      height: r.height * zoom,
    }),
    [zoom],
  );

  // Convert a canvas-pixel rect to PDF units (scale=1).
  const toPdf = useCallback(
    (r: Rectangle): Rectangle => ({
      x: r.x / zoom,
      y: r.y / zoom,
      width: r.width / zoom,
      height: r.height / zoom,
    }),
    [zoom],
  );

  // Redraw overlay whenever rect / zoom / page changes.
  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    const ctx = overlay.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, overlay.width, overlay.height);
    if (!effectiveRect) return;
    const scaled = toCanvas(effectiveRect);
    const color = "#2563eb";
    drawRect(overlay, scaled, color, 3);
    // Resize handle
    ctx.save();
    ctx.fillStyle = color;
    ctx.fillRect(
      scaled.x + scaled.width - HANDLE_SIZE / 2,
      scaled.y + scaled.height - HANDLE_SIZE / 2,
      HANDLE_SIZE,
      HANDLE_SIZE,
    );
    ctx.restore();
  }, [effectiveRect, zoom, toCanvas]);

  const fitWidth = useCallback((): void => {
    const natural = naturalSizeRef.current;
    if (!natural || containerWidth <= 0) return;
    const padding = 16;
    const availW = Math.max(1, containerWidth - padding * 2);
    setZoom(availW / natural.width);
  }, [containerWidth]);

  const zoomIn = useCallback((): void => {
    setZoom((z) => z * ZOOM_FACTOR);
  }, []);
  const zoomOut = useCallback((): void => {
    setZoom((z) => Math.max(0.2, z / ZOOM_FACTOR));
  }, []);
  const prevPage = useCallback((): void => {
    setPageIndex((i) => Math.max(0, i - 1));
  }, [setPageIndex]);
  const nextPage = useCallback((): void => {
    setPageIndex((i) => Math.min(pageCount - 1, i + 1));
  }, [pageCount, setPageIndex]);

  const jumpToPage = useCallback(
    (value: string): void => {
      const n = Number.parseInt(value, 10);
      if (!Number.isFinite(n)) return;
      const idx = Math.min(pageCount - 1, Math.max(0, n - 1));
      setPageIndex(idx);
      setPageInput(String(idx + 1));
    },
    [pageCount, setPageIndex],
  );

  // Keyboard shortcuts.
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName ?? "";
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setPageIndex((i) => Math.max(0, i - 1));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setPageIndex((i) => Math.min(pageCount - 1, i + 1));
      } else if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        setZoom((z) => z * ZOOM_FACTOR);
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        setZoom((z) => Math.max(0.2, z / ZOOM_FACTOR));
      } else if (e.key === "f") {
        e.preventDefault();
        fitWidth();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [pageCount, setPageIndex, fitWidth]);

  // --- Pointer interaction for manual rect editing ---
  const getCanvasPoint = useCallback(
    (e: ReactPointerEvent<HTMLCanvasElement>): { x: number; y: number } => {
      const overlay = overlayRef.current;
      if (!overlay) return { x: 0, y: 0 };
      const rect = overlay.getBoundingClientRect();
      const scaleX = overlay.width / rect.width;
      const scaleY = overlay.height / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    },
    [],
  );

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLCanvasElement>): void => {
      if (!effectiveRect) {
        // Start a "create" drag from this point.
        const p = getCanvasPoint(e);
        const start: Rectangle = { x: p.x, y: p.y, width: 0, height: 0 };
        dragRef.current = {
          mode: "create",
          startPointerX: p.x,
          startPointerY: p.y,
          startRect: start,
        };
        setDraftRect(toPdf(start));
        (e.target as Element).setPointerCapture(e.pointerId);
        return;
      }
      const p = getCanvasPoint(e);
      const scaled = toCanvas(effectiveRect);
      if (pointInHandle(p.x, p.y, scaled)) {
        dragRef.current = {
          mode: "resize",
          startPointerX: p.x,
          startPointerY: p.y,
          startRect: scaled,
        };
        (e.target as Element).setPointerCapture(e.pointerId);
      } else if (pointInRect(p.x, p.y, scaled)) {
        dragRef.current = {
          mode: "move",
          startPointerX: p.x,
          startPointerY: p.y,
          startRect: scaled,
        };
        (e.target as Element).setPointerCapture(e.pointerId);
      }
    },
    [effectiveRect, getCanvasPoint, toCanvas, toPdf],
  );

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLCanvasElement>): void => {
      const drag = dragRef.current;
      if (!drag) return;
      const p = getCanvasPoint(e);
      let next: Rectangle;
      if (drag.mode === "move") {
        const dx = p.x - drag.startPointerX;
        const dy = p.y - drag.startPointerY;
        next = {
          x: drag.startRect.x + dx,
          y: drag.startRect.y + dy,
          width: drag.startRect.width,
          height: drag.startRect.height,
        };
      } else if (drag.mode === "resize") {
        const dx = p.x - drag.startPointerX;
        const dy = p.y - drag.startPointerY;
        next = {
          x: drag.startRect.x,
          y: drag.startRect.y,
          width: Math.max(HANDLE_SIZE, drag.startRect.width + dx),
          height: Math.max(HANDLE_SIZE, drag.startRect.height + dy),
        };
      } else {
        // create
        const x = Math.min(drag.startPointerX, p.x);
        const y = Math.min(drag.startPointerY, p.y);
        const width = Math.abs(p.x - drag.startPointerX);
        const height = Math.abs(p.y - drag.startPointerY);
        next = { x, y, width, height };
      }
      setDraftRect(toPdf(next));
    },
    [getCanvasPoint, toPdf],
  );

  const commitDraft = useCallback((): void => {
    dragRef.current = null;
    setDraftRect((current) => {
      if (current && current.width > 1 && current.height > 1) {
        setReplacementRect(current);
      }
      return null;
    });
  }, [setReplacementRect]);

  const onPointerUp = useCallback(
    (e: ReactPointerEvent<HTMLCanvasElement>): void => {
      try {
        (e.target as Element).releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      commitDraft();
    },
    [commitDraft],
  );

  const onPointerLeave = useCallback((): void => {
    // Do not commit on leave — the user might be moving outside the canvas
    // momentarily. Pointer capture keeps events flowing.
  }, []);

  const zoomPct = useMemo(() => Math.round(zoom * 100), [zoom]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={prevPage} disabled={pageIndex <= 0} title="Previous page">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={nextPage} disabled={pageIndex >= pageCount - 1} title="Next page">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Input
            value={pageInput}
            onChange={(e) => setPageInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") jumpToPage(pageInput);
            }}
            className="h-8 w-14 text-center"
            inputMode="numeric"
          />
          <span>/ {pageCount}</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => jumpToPage(pageInput)}
          title="Jump to page"
        >
          <Search className="mr-1 h-4 w-4" /> Go
        </Button>
        <div className="ml-auto flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={zoomOut} title="Zoom out">
            <Minus className="h-4 w-4" />
          </Button>
          <span className="min-w-[3rem] text-center text-xs tabular-nums text-muted-foreground">
            {zoomPct}%
          </span>
          <Button variant="outline" size="icon" onClick={zoomIn} title="Zoom in">
            <Plus className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={fitWidth} title="Fit width (f)">
            <Maximize className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div
        ref={containerRef}
        className={cn(
          "relative flex flex-1 items-start justify-center overflow-auto rounded-md border bg-muted/30 p-2",
        )}
      >
        <div ref={wrapperRef} className="relative">
          <canvas
            ref={overlayRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerLeave}
            className="absolute left-0 top-0 h-full w-full touch-none"
            style={{ pointerEvents: "auto" }}
          />
        </div>
        {!effectiveRect && (
          <div className="pointer-events-none absolute bottom-2 left-2 rounded bg-background/80 px-2 py-1 text-xs text-muted-foreground">
            Drag on the page to mark where the new logo goes. The same area is applied to every page of every PDF.
          </div>
        )}
      </div>
    </div>
  );
}