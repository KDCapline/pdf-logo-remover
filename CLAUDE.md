# PDF Logo Replacer

A React 19 + Vite + Tailwind app that finds a target logo inside uploaded PDFs
and replaces it with a chosen logo across pages. Built with Radix primitives,
framer-motion, pdf-lib, pdfjs-dist, and a Zustand store.

## Stack

- React 19, TypeScript, Vite 8, Tailwind 3
- Radix UI primitives (Dialog, Tabs, Slider, Switch, Dropdown, ScrollArea, Progress, Tooltip)
- pdf-lib, pdfjs-dist, jszip, file-saver
- framer-motion, sonner toasts, lucide icons
- Zustand store, react-dropzone
- oxlint

## Layout

```
src/
  App.tsx                  // TooltipProvider + Dashboard + Toaster
  pages/Dashboard/         // main page
  components/
    UploadArea/            // drag-and-drop PDF + logo inputs
    LogoUploader/          // replacement logo (PNG/SVG)
    PDFPreview/            // canvas-based PDF page preview
    Queue/                 // bulk processing list
    Progress/              // per-file progress UI
    Settings/              // match settings (tolerance, scope)
    Toolbar/               // top action bar
    Help/                  // in-app help dialog
    Theme/                 // dark/light toggle
    ui/                    // shadcn-style primitives on Radix
  hooks/                   // useBulkQueue, usePDFProcessor
  store/useAppStore.ts     // Zustand store
  services/                // pdf logic
  utils/                   // helpers (cn, etc.)
```

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. When in doubt, invoke the skill.

Key routing rules:
- Product ideas/brainstorming → invoke /office-hours
- Strategy/scope → invoke /plan-ceo-review
- Architecture → invoke /plan-eng-review
- Design system/plan review → invoke /design-consultation or /plan-design-review
- Full review pipeline → invoke /autoplan
- Bugs/errors → invoke /investigate
- QA/testing site behavior → invoke /qa or /qa-only
- Code review/diff check → invoke /review
- Visual polish → invoke /design-review
- Ship/deploy/PR → invoke /ship or /land-and-deploy
- Save progress → invoke /context-save
- Resume context → invoke /context-restore
- Author a backlog-ready spec/issue → invoke /spec