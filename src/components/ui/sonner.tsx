import { Toaster as SonnerToaster, type ToasterProps } from "sonner";
import { useAppStore } from "@/store/useAppStore";

type ResolvedTheme = "light" | "dark" | "system";

/**
 * Toaster wrapper that maps the app's Theme to sonner's theme prop.
 * Re-exports sonner's Toaster so feature code can `import { Toaster } from "@/components/ui/sonner"`.
 */
export function Toaster(props: ToasterProps) {
  const theme = useAppStore((state) => state.theme) as ResolvedTheme;
  return (
    <SonnerToaster
      theme={theme}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:rounded-xl group-[.toaster]:border group-[.toaster]:border-border/60 group-[.toaster]:bg-card group-[.toaster]:text-foreground group-[.toaster]:shadow-[0_10px_30px_-10px_hsl(var(--foreground)/0.18)] group-[.toaster]:backdrop-blur-xl",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-full",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:rounded-full",
        },
      }}
      {...props}
    />
  );
}

export { toast } from "sonner";