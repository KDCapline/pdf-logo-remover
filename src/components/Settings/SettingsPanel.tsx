// SettingsPanel: concurrency control bound to the persisted settings slice.
// "Reset to defaults" restores DEFAULT_SETTINGS.
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/useAppStore";
import { DEFAULT_SETTINGS } from "@/types";
import { RotateCcw } from "lucide-react";

const CONCURRENCY_OPTIONS = [1, 2, 3, 4, 5] as const;

export function SettingsPanel() {
  const settings = useAppStore((state) => state.settings);
  const setConcurrency = useAppStore((state) => state.setConcurrency);
  const resetSettings = useAppStore((state) => state.resetSettings);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle>Settings</CardTitle>
          <Button variant="ghost" size="sm" onClick={resetSettings}>
            <RotateCcw className="mr-1 h-3.5 w-3.5" /> Reset
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="concurrency-select">Concurrency</Label>
            <span className="text-xs text-muted-foreground">
              default {DEFAULT_SETTINGS.concurrency}
            </span>
          </div>
          <div id="concurrency-select" className="flex flex-wrap gap-2">
            {CONCURRENCY_OPTIONS.map((n) => {
              const active = settings.concurrency === n;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => setConcurrency(n)}
                  className={
                    "h-9 min-w-2.5rem rounded-full border px-3 text-sm font-semibold transition-all " +
                    (active
                      ? "border-transparent bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-[0_4px_14px_-2px_hsl(var(--primary)/0.4)]"
                      : "border-border/60 bg-background/60 text-foreground hover:border-primary/40 hover:bg-accent/50")
                  }
                  aria-pressed={active}
                  aria-label={`Concurrency ${n}`}
                >
                  {n}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            Number of PDFs processed in parallel.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}