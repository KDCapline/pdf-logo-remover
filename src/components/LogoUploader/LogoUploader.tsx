// LogoUploader: drop the new logo image. Reads as data URL, measures
// dimensions, stores into the newLogo slot. Shows preview + remove.
import { useCallback } from "react";
import { Check, ImagePlus, X } from "lucide-react";
import { Dropzone } from "@/components/UploadArea/Dropzone";
import { useAppStore } from "@/store/useAppStore";
import { fileToDataURL, loadImage } from "@/utils/image";
import { uid } from "@/utils/pdf";
import type { LogoImage } from "@/types";
import { toast } from "sonner";

const LOGO_ACCEPT = {
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/svg+xml": [".svg"],
} as const;

export function LogoUploader() {
  const logo = useAppStore((state) => state.newLogo);
  const setLogo = useAppStore((state) => state.setNewLogo);
  const clearLogo = useAppStore((state) => state.clearNewLogo);

  const onFiles = useCallback(
    async (files: File[]): Promise<void> => {
      const file = files[0];
      if (!file) return;
      try {
        const dataUrl = await fileToDataURL(file);
        const img = await loadImage(dataUrl);
        const next: LogoImage = {
          id: uid(),
          file,
          name: file.name,
          dataUrl,
          width: img.naturalWidth || img.width,
          height: img.naturalHeight || img.height,
        };
        setLogo(next);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        toast.error(`Failed to load logo: ${message}`);
      }
    },
    [setLogo],
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-full bg-primary/15 text-primary">
            <ImagePlus className="h-3.5 w-3.5" />
          </span>
          <h3 className="text-sm font-semibold">New logo</h3>
        </div>
        {logo != null && (
          <button
            type="button"
            onClick={clearLogo}
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-3 w-3" /> Remove
          </button>
        )}
      </div>
      {logo == null ? (
        <Dropzone
          accept={LOGO_ACCEPT}
          onFiles={(f) => void onFiles(f)}
          label="Upload new logo"
          hint="PNG, JPG or SVG — applied to every page"
          icon={<ImagePlus className="h-5 w-5" />}
        />
      ) : (
        <div className="flex items-center gap-3 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5 p-3 shadow-[0_4px_14px_-6px_hsl(var(--primary)/0.25)]">
          <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-xl border border-border/60 bg-card p-1.5 shadow-sm">
            <img
              src={logo.dataUrl}
              alt={logo.name}
              className="h-full w-full object-contain"
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="truncate text-sm font-semibold">{logo.name}</p>
              <Check className="h-3.5 w-3.5 text-emerald-500" />
            </div>
            <p className="text-xs text-muted-foreground">
              {logo.width} × {logo.height}px
            </p>
          </div>
        </div>
      )}
    </div>
  );
}