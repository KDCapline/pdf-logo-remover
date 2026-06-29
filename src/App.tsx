// App root: composes the Dashboard inside Radix providers and mounts the Toaster.
import { Dashboard } from "@/pages/Dashboard/Dashboard";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

function App() {
  return (
    <TooltipProvider delayDuration={200}>
      <Dashboard />
      <Toaster richColors position="bottom-right" />
    </TooltipProvider>
  );
}

export default App;