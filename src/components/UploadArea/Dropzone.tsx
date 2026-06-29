// Dropzone: thin react-dropzone wrapper with rounded-2xl border, dashed
// border, drag-active gradient highlight, and a Framer Motion scale.
import { type ReactNode, useCallback } from "react";
import { useDropzone, type Accept, type FileRejection } from "react-dropzone";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

export interface DropzoneProps {
  accept?: Accept;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
  label: string;
  hint?: string;
  icon?: ReactNode;
  className?: string;
}

export function Dropzone({
  accept,
  multiple = false,
  onFiles,
  label,
  hint,
  icon,
  className,
}: DropzoneProps) {
  const onDrop = useCallback(
    (accepted: File[], rejections: FileRejection[]): void => {
      if (rejections.length > 0) return;
      if (accepted.length === 0) return;
      onFiles(multiple ? accepted : accepted.slice(0, 1));
    },
    [onFiles, multiple],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    multiple,
  });

  const rootProps = getRootProps() as unknown as HTMLMotionProps<"div">;

  return (
    <motion.div
      {...rootProps}
      className={cn(
        "relative flex cursor-pointer flex-col items-center justify-center gap-2.5 overflow-hidden rounded-2xl border-2 border-dashed border-border/60 bg-muted/30 px-4 py-9 text-center transition-colors hover:border-primary/60 hover:bg-primary/5",
        isDragActive &&
          "border-primary bg-gradient-to-br from-primary/10 to-accent/10 shadow-[0_8px_28px_-12px_hsl(var(--primary)/0.35)]",
        className,
      )}
      animate={{ scale: isDragActive ? 1.02 : 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
    >
      {isDragActive && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.18),transparent_60%)]"
        />
      )}
      <div className="relative z-10">
        {icon != null && (
          <div
            className={cn(
              "mx-auto mb-1 grid size-10 place-items-center rounded-xl bg-card text-muted-foreground shadow-sm transition-colors",
              isDragActive && "bg-primary/15 text-primary",
            )}
            aria-hidden
          >
            {icon}
          </div>
        )}
        <p className="text-sm font-semibold text-foreground">{label}</p>
        {hint != null && (
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        )}
      </div>
      <input {...getInputProps()} className="sr-only" aria-label={label} />
    </motion.div>
  );
}