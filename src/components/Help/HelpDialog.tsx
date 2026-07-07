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
import { MAX_PDFS } from "@/types";
import { Sparkles } from "lucide-react";

const HOW_TO_STEPS: readonly string[] = [
  "Drop one or more PDFs into the upload area (up to " + MAX_PDFS + " at a time).",
  "Upload your new logo (PNG, JPG, or SVG) — the image that will replace the old one.",
  "Select a PDF in the preview, go to each page that needs the logo replaced, and drag a rectangle over the existing logo. You can move or resize the mark afterward.",
  "For bulk batches: if every PDF has the logo in the same place, mark one PDF only — the rest inherit that position. If alignments differ, switch files in the preview and mark each PDF separately.",
  "Click Replace logos. Processed files can be downloaded as a ZIP; use Export Report for a JSON summary.",
];

const SETTINGS_ITEMS: readonly { title: string; description: string }[] = [
  {
    title: "Concurrency",
    description:
      "How many PDFs are processed in parallel. Lower this if your browser feels sluggish on large batches.",
  },
  {
    title: "Smart page matching",
    description:
      "Checks each marked page before replacing. Pages where the logo is not found at the marked position are skipped, so blank or unrelated pages are not overwritten.",
  },
  {
    title: "Auto-locate logo",
    description:
      "Fallback when a fixed mark does not match. The app first tries your marked position, then searches nearby, and only scans the full page if needed. Turn this on when logo placement varies across PDFs or your mark is only approximate.",
  },
];

const MARKING_TIPS: readonly string[] = [
  "Marks are saved per PDF — drawing on one file does not move the rectangle on another.",
  "Mark every page you want replaced. Unmarked pages are left unchanged.",
  "When you mark one PDF in a same-layout batch, unmarked PDFs reuse those page numbers and coordinates automatically.",
  "For mixed batches, mark the outlier PDFs individually; same-layout files can still share the first mark.",
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
            Marking &amp; bulk tips
          </h3>
          <ul className="space-y-2 text-sm">
            {MARKING_TIPS.map((tip) => (
              <li key={tip} className="flex gap-2 text-foreground/90">
                <span className="mt-2 size-1 shrink-0 rounded-full bg-primary/60" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Settings
          </h3>
          <ul className="divide-y divide-border/60 rounded-xl border border-border/60 bg-muted/30 text-sm">
            {SETTINGS_ITEMS.map((item) => (
              <li key={item.title} className="space-y-1 px-4 py-3">
                <p className="font-medium text-foreground">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </li>
            ))}
          </ul>
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
