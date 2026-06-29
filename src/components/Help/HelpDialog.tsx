// HelpDialog: in-app help. Open state is owned by the store
// (store.ui.helpOpen) so any component can open it via setHelpOpen(true).
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAppStore } from "@/store/useAppStore";
import { Sparkles } from "lucide-react";

const HOW_TO_STEPS: readonly string[] = [
  "Drop one or more PDFs into the upload area.",
  "Upload your new logo (PNG/JPG/SVG) — the image that will replace the old one.",
  "On the preview, drag to draw a rectangle over the logo area you want to replace.",
  "Click Replace. The same area is replaced on every page of every uploaded PDF.",
  "Download a ZIP of the processed PDFs and export the report.",
];

const SUPPORTED_FORMATS: readonly { label: string; value: string }[] = [
  { label: "Input PDFs", value: ".pdf" },
  { label: "New logo", value: "PNG, JPG/JPEG, SVG" },
  { label: "Output", value: ".pdf (in a ZIP)" },
  { label: "Report", value: "JSON" },
];

const KEYBOARD_SHORTCUTS: readonly { keys: string[]; action: string }[] = [
  { keys: ["←", "→"], action: "Previous / next page" },
  { keys: ["+", "-"], action: "Zoom in / out" },
  { keys: ["f"], action: "Fit page to width" },
  { keys: ["0"], action: "Reset zoom" },
  { keys: ["Esc"], action: "Close dialog" },
];

export function HelpDialog() {
  const helpOpen = useAppStore((state) => state.ui.helpOpen);
  const setHelpOpen = useAppStore((state) => state.setHelpOpen);

  return (
    <Dialog open={helpOpen} onOpenChange={(open) => setHelpOpen(open)}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-[0_4px_14px_-4px_hsl(var(--primary)/0.45)]">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <DialogTitle>Help</DialogTitle>
              <DialogDescription>
                Everything runs in your browser — no uploads, no servers.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            How it works
          </h3>
          <ol className="space-y-2 text-sm">
            {HOW_TO_STEPS.map((step, idx) => (
              <li key={step} className="flex gap-3">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary">
                  {idx + 1}
                </span>
                <span className="text-foreground/90">{step}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Supported formats
          </h3>
          <ul className="divide-y divide-border/60 rounded-xl border border-border/60 bg-muted/30 text-sm">
            {SUPPORTED_FORMATS.map((fmt) => (
              <li
                key={fmt.label}
                className="flex items-center justify-between gap-4 px-4 py-2.5"
              >
                <span className="text-muted-foreground">{fmt.label}</span>
                <span className="rounded-md bg-card px-2 py-0.5 font-mono text-xs font-medium">
                  {fmt.value}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Keyboard shortcuts
          </h3>
          <table className="w-full text-sm">
            <tbody>
              {KEYBOARD_SHORTCUTS.map((row) => (
                <tr key={row.action} className="border-b border-border/60 last:border-0">
                  <td className="py-2 pr-4">
                    <span className="flex flex-wrap gap-1">
                      {row.keys.map((key, idx) => (
                        <kbd
                          key={`${row.action}-${key}-${idx}`}
                          className="inline-flex min-w-[1.5rem] items-center justify-center rounded-md border border-border/60 bg-muted px-1.5 py-0.5 font-mono text-xs font-medium"
                        >
                          {key}
                        </kbd>
                      ))}
                    </span>
                  </td>
                  <td className="py-2 text-foreground/90">{row.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section>
          <p className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5 text-xs text-foreground/80">
            All processing happens in your browser. Files never leave your computer.
          </p>
        </section>
      </DialogContent>
    </Dialog>
  );
}