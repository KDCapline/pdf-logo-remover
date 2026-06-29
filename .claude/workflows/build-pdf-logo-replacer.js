export const meta = {
  name: 'build-pdf-logo-replacer',
  description: 'Build production PDF Logo Replacer React 19 + Vite + TS + Tailwind + shadcn app in ~/Desktop/pdf replace/pdf-logo-replacer',
  phases: [
    { title: 'Scaffold' },
    { title: 'Foundation' },
    { title: 'Services' },
    { title: 'HooksAndWorkers' },
    { title: 'Components' },
    { title: 'Wiring' },
    { title: 'Verify' },
  ],
}

const ROOT = '/Users/kumardivyanshu/Desktop/pdf replace/pdf-logo-replacer'

const COMMON = [
  'Project: "PDF Logo Replacer" — a fully browser-based app. NO backend, NO server, NO database, NO cloud, NO external API. All PDF processing happens client-side. Strict TypeScript (no "any"). Clean architecture: UI never touches PDFs directly; everything goes through services/. Use path alias "@/*" -> "./src/*".',
  '',
  'Target dir: ' + ROOT + ' (contains a Vite scaffold from the Scaffold phase). Quote all bash paths containing the space.',
].join('\n')

function scaffoldPrompt() {
  return [
    COMMON,
    '',
    'TASK: Scaffold a Vite + React 19 + TypeScript project at ' + ROOT + ' and install all dependencies. The directory may not exist yet. Do NOT write application code — only scaffold + config.',
    '',
    'Steps:',
    '1. mkdir -p "' + ROOT + '"',
    '2. cd "' + ROOT + '" && npm create vite@latest . -- --template react-ts   (non-interactive; if it warns the dir is not empty, proceed)',
    '3. npm install',
    '4. Runtime deps: npm install pdfjs-dist pdf-lib jszip file-saver react-dropzone zustand framer-motion sonner lucide-react clsx tailwind-merge class-variance-authority @radix-ui/react-slot @radix-ui/react-slider @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-tooltip @radix-ui/react-tabs @radix-ui/react-progress @radix-ui/react-switch @radix-ui/react-separator @radix-ui/react-scroll-area',
    '5. Dev deps: npm install -D tailwindcss@3 postcss autoprefixer @types/file-saver',
    '6. npx tailwindcss init -p',
    '7. tailwind.config.js: content paths ["./index.html","./src/**/*.{ts,tsx}"], darkMode "class", theme.extend with CSS-variable-based shadcn colors (background, foreground, card, card-foreground, popover, popover-foreground, primary, primary-foreground, secondary, secondary-foreground, muted, muted-foreground, accent, accent-foreground, destructive, destructive-foreground, border, input, ring) using hsl(var(--...)), borderRadius using --radius, container.',
    '8. src/index.css: @tailwind base; @tailwind components; @tailwind utilities; @layer base with :root and .dark CSS variable definitions (HSL triples) for all shadcn tokens; base body styles applying bg-background text-foreground; a base layer for * { @apply border-border; } and body { @apply bg-background text-foreground; }.',
    '9. tsconfig.json: strict true, noUnusedLocals true, noUnusedParameters true, noImplicitAny true, jsx react-jsx, moduleResolution bundler, baseUrl ".", paths {"@/*":["./src/*"]}. Also add/update tsconfig.node.json for the vite config file.',
    '10. vite.config.ts: react plugin, resolve.alias { "@": path.resolve(__dirname, "./src") }, worker: { format: "es" }.',
    '11. Create src/lib/utils.ts exporting cn() = (...inputs) => twMerge(clsx(inputs)).',
    '12. Create src/vite-env.d.ts with /// <reference types="vite/client" /> and declare module for "*?url" { const src: string; export default src }.',
    '13. Replace src/App.tsx with a minimal placeholder that renders the text "PDF Logo Replacer — scaffold OK" centered, so the app boots.',
    '14. Remove default Vite logo assets and unused CSS.',
    '15. Update index.html <title> to "PDF Logo Replacer".',
    '16. Run npm run build and fix any errors until it passes. Report final build status and the file tree (ls -R src and a depth-2 tree of the project root).',
    '',
    'Do NOT create components/, pages/, hooks/, services/, workers/, utils/, types/ application code yet — only the scaffold above.',
  ].join('\n')
}

function foundationPrompt() {
  return [
    COMMON,
    '',
    'TASK: Create the foundational layer: types, utils, store, and shadcn UI primitives. Do NOT create services or feature components yet.',
    '',
    'src/types/index.ts — export:',
    '- Rectangle { x:number; y:number; width:number; height:number }',
    '- DetectionResult extends Rectangle { confidence:number; page:number; pageIndex:number }',
    '- LogoImage { id:string; file:File; name:string; dataUrl:string; width:number; height:number; imageBitmap?:ImageBitmap }',
    '- FileStatus = "pending" | "queued" | "processing" | "processed" | "skipped" | "error" | "canceled"',
    '- PDFFileItem { id:string; file:File; name:string; size:number; pageCount:number; thumbnailUrl:string|null; status:FileStatus; progress:number; currentPage:number; error?:string; reason?:string; resultBlobUrl?:string; selectedPages:number[]; manualRect?:Record<number,Rectangle>; detection?:Record<number,DetectionResult> }',
    '- ProcessingSettings { threshold:number; concurrency:number; scale:number }  // defaults: threshold 0.85, concurrency 3, scale 1.5',
    '- ReportItem { name:string; status:"processed"|"skipped"|"error"; reason?:string; durationMs?:number }',
    '- Theme = "light"|"dark"|"system"',
    '',
    'src/utils/canvas.ts:',
    '- export function releaseCanvas(canvas: HTMLCanvasElement|null|undefined): void  // set width=height=0',
    '- export function canvasToDataURL(canvas, type="image/png", quality?): string',
    '- export function canvasToBlob(canvas, type="image/png", quality?): Promise<Blob>',
    '',
    'src/utils/image.ts:',
    '- export async function fileToDataURL(file:File): Promise<string>',
    '- export async function loadImage(src:string): Promise<HTMLImageElement>',
    '- export async function fileToImageBitmap(file:File): Promise<ImageBitmap>',
    '',
    'src/utils/pdf.ts:',
    '- export function formatBytes(bytes:number): string',
    '- export function formatDuration(ms:number): string',
    '- export function downloadBlob(blob:Blob, filename:string): void  // use file-saver saveAs',
    '- export function uid(): string  // crypto.randomUUID with fallback',
    '',
    'src/utils/queue.ts:',
    '- export type TaskRunner<T> = () => Promise<T>',
    '- export interface QueueHandle { add:(runner:TaskRunner<unknown>)=>void; cancel:()=>void; onProgress?:(done:number,total:number,active:number)=>void; wait:()=>Promise<void> }',
    '- export function createConcurrentQueue(concurrency:number): QueueHandle  // runs at most `concurrency` runners at once; cancel() rejects pending runners; wait() resolves when idle.',
    '',
    'src/store/useAppStore.ts — Zustand store with persist (localStorage) persisting ONLY settings + theme:',
    '- files: PDFFileItem[]; addFiles, removeFile, clearFiles, updateFile(id, patch), setFileStatus, setManualRect(id, pageIndex, rect), setSelectedPages, togglePage',
    '- oldLogo: LogoImage|null; setOldLogo, clearOldLogo',
    '- newLogo: LogoImage|null; setNewLogo, clearNewLogo',
    '- settings: ProcessingSettings; setThreshold, setConcurrency, setScale, resetSettings',
    '- theme: Theme; setTheme',
    '- isProcessing:boolean; cancelRequested:boolean; startProcessing, cancelProcessing, resetCancel',
    '- report: ReportItem[]; addReport, clearReport',
    '- selectedFileId:string|null; setSelectedFileId',
    '- ui: { helpOpen:boolean }; setHelpOpen',
    '- retryFailed:boolean; setRetryFailed',
    '- Use create()(persist(..., { name:"pdf-logo-replacer", partialize: (s) => ({ settings: s.settings, theme: s.theme }) }))',
    '',
    'src/components/ui/ — hand-written shadcn primitives (not via CLI), styled with Tailwind + CSS vars + Radix:',
    'button.tsx, card.tsx, slider.tsx, progress.tsx, dialog.tsx, tabs.tsx, tooltip.tsx, dropdown-menu.tsx, switch.tsx, separator.tsx, input.tsx, label.tsx, scroll-area.tsx, badge.tsx, sonner.tsx (Toaster wrapper re-exporting sonner Toaster with theme mapping).',
    'Each must use React.forwardRef, cn(), displayName, cva where appropriate. Strict typing. No "any".',
    '',
    'Finally run npm run build from ' + ROOT + '; fix errors until it passes. Report build status and a tree of src/.',
  ].join('\n')
}

function servicesPrompt() {
  return [
    COMMON,
    '',
    'TASK: Build the service layer doing real PDF work. Use existing src/types and src/utils. NO placeholders, NO mocks — real implementations.',
    '',
    'src/services/pdfRenderer.ts:',
    '- import the pdfjs worker URL via: import PdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url"; set GlobalWorkerOptions.workerSrc = PdfjsWorker.',
    '- export async function loadPdf(file:File): Promise<PDFDocumentProxy>',
    '- export async function getPageCount(doc): Promise<number>',
    '- export async function renderPageToCanvas(doc, pageIndex:number, scale:number, canvas?:HTMLCanvasElement): Promise<{canvas:HTMLCanvasElement; width:number; height:number; viewport:PageViewport}>  // page = await doc.getPage(pageIndex+1); viewport = page.getViewport({scale}); set canvas.width/height; ctx = canvas.getContext("2d",{willReadWillFrequently:true}); await page.render({canvasContext:ctx, viewport}).promise',
    '- export async function renderPageThumbnail(doc, pageIndex, maxW=220): Promise<string>  // scale = maxW / viewport@1.width; return canvas.toDataURL("image/png")',
    '- export async function makeImageBitmapFromCanvas(canvas): Promise<ImageBitmap>',
    '',
    'src/services/logoDetector.ts — real OpenCV.js template matching loaded from CDN at runtime:',
    '- const OPENCV_URL = "https://docs.opencv.org/4.10.0/opencv.js"',
    '- export function loadOpenCV(): Promise<cv>  // inject <script> once, resolve when window.cv is ready and cv.Mat exists (poll every 50ms up to ~20s). Cache the promise.',
    '- export function isReady(): boolean',
    '- export async function matchTemplate(pageCanvas:HTMLCanvasElement, template:HTMLImageElement|HTMLCanvasElement|ImageBitmap, threshold:number, scaleHint=1.0): Promise<DetectionResult|null>',
    '  Steps:',
    '   * read page canvas into cv.Mat via cv.imread',
    '   * read template into cv.Mat (if HTMLImageElement/Canvas use cv.imread; if ImageBitmap put it on a temp canvas first)',
    '   * convert both RGBA->GRAY via cv.cvtColor',
    '   * downscale large pages to max working dimension 1400px keeping aspect; remember the inverse scale factor to map back to original coordinates',
    '   * optionally scale the template by scaleHint; if scaleHint != 1, try [0.9, 1.0, 1.1] * scaleHint and keep the best',
    '   * cv.matchTemplate(pageGray, tplGray, result, cv.TM_CCOEFF_NORMED)',
    '   * cv.minMaxLoc(result) -> {maxVal, maxLoc:{x,y}}',
    '   * if maxVal >= threshold: compute width,height from template (scaled), multiply coords by inverse scale to return original-page coordinates; return DetectionResult {x,y,width,height,confidence:maxVal,page:pageIndex+1,pageIndex}',
    '   * always release Mats in a try/finally (mat.delete(), result.delete(), gray deletes, template mats). Never leak.',
    '- export function drawDetection(canvas:HTMLCanvasElement, rect:Rectangle, color="green", strokeWidth=3): void',
    '- Handle not-ready by awaiting loadOpenCV first.',
    '- Keep all OpenCV `any`-ish casts isolated to this file. Add eslint-disable-next-line @typescript-eslint/no-explicit-any where truly needed.',
    '',
    'src/services/pdfEditor.ts — real replacement with pdf-lib:',
    '- export async function replaceLogoInPdf(file:File, oldLogo:LogoImage, newLogo:LogoImage, detections:Record<number,DetectionResult>, manualRects:Record<number,Rectangle>, selectedPages:number[], settings:ProcessingSettings): Promise<{blob:Blob; matched:number; skippedPages:number[]}>',
    '  Steps:',
    '   * const bytes = await file.arrayBuffer(); const pdf = await PDFDocument.load(bytes, { ignoreEncryption:true })',
    '   * const newLogoBytes = await (await fetch(newLogo.dataUrl)).arrayBuffer(); embed via pdf.embedPng for png or pdf.embedJpg for jpg/jpeg — choose by newLogo.file.type or name extension. For SVG, rasterize first to a PNG via an <canvas> in services if needed; if SVG rasterization is complex, document the limitation and convert using a small canvas helper.',
    '   * For each page index (0-based) in selectedPages (if empty, all pages):',
    '     - rect = manualRects[pageIndex] ?? detections[pageIndex]',
    '     - if no rect -> push pageIndex to skippedPages; continue',
    '     - const page = pdf.getPage(pageIndex); const {width:pw,height:ph} = page.getSize()',
    '     - convert top-left detection coords to pdf-lib bottom-left: pdfY = ph - (rect.y + rect.height)',
    '     - page.drawRectangle({ x: rect.x, y: pdfY, width: rect.width, height: rect.height, color: rgb(1,1,1) })  // cover old logo',
    '     - contain-fit new logo inside rect preserving new-logo aspect: aspect = newImg.width/newImg.height; let w=rect.width,h=rect.width/aspect; if(h>rect.height){h=rect.height;w=rect.height*aspect} dx=rect.x+(rect.width-w)/2; dy=pdfY+(rect.height-h)/2; page.drawImage(newImg,{x:dx,y:dy,width:w,height:h})',
    '     - matched++',
    '   * Handle page rotation 90/270 by best-effort: if page.getRotation().angle in [90,270] swap w/h interpretation and translate; document the assumption with a short comment. Correct for 0 and 180.',
    '   * const out = await pdf.save(); return { blob: new Blob([out],{type:"application/pdf"}), matched, skippedPages }',
    '',
    'src/services/zipGenerator.ts:',
    '- export async function buildZip(items:{name:string;blob:Blob}[], onProgress?:(p:number)=>void): Promise<Blob>  // JSZip; rename to originalname_updated.pdf (strip trailing .pdf first); use generateAsync({type:"blob"}, onUpdate=onProgress)',
    '- export function downloadZip(blob:Blob, name="pdfs_updated.zip"): void  // file-saver saveAs',
    '',
    'Workers (keep valid + compiling):',
    'src/workers/pdf.worker.ts — receives {file,pageIndex,scale}; renders that page to an OffscreenCanvas using pdfjs (load worker via ?url inside worker context; note: pdfjs in a worker may need GlobalWorkerOptions.workerSrc set to a same-thread worker — use the "fake worker" / disable worker by setting GlobalWorkerOptions.workerSrc to empty or a data URL; simplest: set pdfjs.GlobalWorkerOptions.workerSrc = "" and it will run on the main thread of the worker). Post back {bitmap:ImageBitmap,width,height} transferable. try/catch and post errors.',
    'src/workers/processing.worker.ts — receives {pageImage:ImageBitmap, template:ImageBitmap, threshold} and runs OpenCV matchTemplate by importing OpenCV via importScripts(OPENCV_URL) inside the worker. Return DetectionResult. try/catch. If unreliable, keep the file compiling and note the fallback.',
    '',
    'Type hints: add declare module "*?url" and "*?worker" in src/vite-env.d.ts if needed. Ensure pdfjs-dist types resolve (import type * as pdfjs from "pdfjs-dist").',
    '',
    'Run npm run build from ' + ROOT + ' and fix all errors. Report build status and the list of files created.',
  ].join('\n')
}

function hooksPrompt() {
  return [
    COMMON,
    '',
    'TASK: Build hooks that orchestrate services for the UI. Real logic, no mocks.',
    '',
    'src/hooks/useOpenCV.ts:',
    '- Returns { ready:boolean; loading:boolean; error:string|null; load:()=>Promise<void> }',
    '- On mount call loadOpenCV() from services/logoDetector; ready = isReady(); reuse the shared promise. load() retries.',
    '',
    'src/hooks/usePDFProcessor.ts:',
    '- Exposes processFile(item, oldLogo, newLogo, settings, signal:{canceled:boolean}): Promise<ReportItem>',
    '  1. load pdf via loadPdf(item.file)',
    '  2. pageCount = await getPageCount(doc)',
    '  3. selectedPages = item.selectedPages?.length ? item.selectedPages : Array.from({length:pageCount},(_,i)=>i)',
    '  4. load oldLogo HTMLImageElement once from oldLogo.dataUrl',
    '  5. for each pageIndex: if signal.canceled throw/abort; render page to canvas at settings.scale via renderPageToCanvas; run matchTemplate(canvas, oldLogoImg, settings.threshold, settings.scale); if manualRects[pageIndex] exists, use it instead; collect detections keyed by pageIndex; updateFile progress currentPage; releaseCanvas after each page',
    '  6. call replaceLogoInPdf(item.file, oldLogo, newLogo, detections, item.manualRect ?? {}, selectedPages, settings) -> blob',
    '  7. createObjectURL(blob); updateFile resultBlobUrl; return ReportItem {name, status:"processed"}; if matched===0 -> status:"skipped", reason:"No matches found"',
    '  8. catch -> return ReportItem {name, status:"error", reason:err.message}',
    '- Expose renderPageForPreview(file, pageIndex, scale): Promise<{canvas:HTMLCanvasElement; cleanup:()=>void}>',
    '- useCallback/useRef; no "any".',
    '',
    'src/hooks/useBulkQueue.ts:',
    '- Wraps processFile with createConcurrentQueue(settings.concurrency).',
    '- Returns { start, cancel, isProcessing, progress:{done,total,active,currentName,elapsedMs,remaining} }',
    '- start(): capture startTime=Date.now() via ref. Build list from store.files (status pending/queued, plus error if store.retryFailed). total = list.length. Use createConcurrentQueue(settings.concurrency). For each file: set status "processing"; call processFile with signal {canceled: store.cancelRequested}; on success status "processed" + addReport; on skip status "skipped" + addReport; on error status "error" + addReport. Track done++ and remaining=total-done. On finish set isProcessing=false.',
    '- cancel(): store.cancelProcessing(); queue.cancel(); queued runners reject -> mark those files "canceled".',
    '- Recreate queue on each start (not mid-run).',
    '',
    'Make all hooks strict-typed and compiling. Run npm run build from ' + ROOT + ' and fix errors. Report build status + files created.',
  ].join('\n')
}

function componentsPrompt() {
  return [
    COMMON,
    '',
    'TASK: Build all UI components and the Dashboard page. Real, functional components — no placeholders. Strict TS, no "any". Responsive (mobile-first), Tailwind classes, dark-mode aware, Framer Motion where it adds value.',
    '',
    'src/components/Theme/ThemeToggle.tsx — dropdown (light/dark/system) using store.theme; apply "dark" class to documentElement. Provide useResolvedTheme() that listens to matchMedia for system. Apply on mount and on change.',
    '',
    'src/components/UploadArea/Dropzone.tsx — react-dropzone wrapper: props {accept, multiple, onFiles:(files:File[])=>void, label, hint, icon}. Dashed border, drag-active highlight. Framer Motion scale on drag-active.',
    '',
    'src/components/UploadArea/PdfDropzone.tsx — Dropzone accept application/pdf, multiple; on drop: for each File build a PDFFileItem (uid(), name, size, pageCount=0, thumbnailUrl=null, status "pending", progress 0, selectedPages []); addFiles; then async load pdf, getPageCount, renderPageThumbnail -> updateFile {pageCount, thumbnailUrl}. Show per-item loading while pageCount===0.',
    '',
    'src/components/LogoUploader/LogoUploader.tsx — props {kind:"old"|"new"}; Dropzone accept image/png,image/jpeg,image/svg+xml; on file: fileToDataURL, loadImage to get width/height, setOldLogo/setNewLogo. Preview image with width/height + filename + remove (clearOldLogo/clearNewLogo).',
    '',
    'src/components/Queue/FileList.tsx — list of PDFFileItem: thumbnail (or placeholder), filename, size (formatBytes), pageCount, status badge, remove button. Drag-and-drop reordering via HTML5 drag events (draggable rows + onDragStart/onDragOver/onDrop reordering in local state then sync to store order via a setFiles action you add if missing). "Clear All" button. Search box filtering by filename. Click row -> store.setSelectedFileId(item.id). Show inline progress bar when status==="processing". "Retry" button for error/skipped rows (sets status back to "pending").',
    '',
    'src/components/Progress/BulkProgress.tsx — when isProcessing show: current file name, elapsed time (formatDuration), remaining count, overall Progress bar (done/total), active count, Cancel button (useBulkQueue.cancel). Reads store + hook.',
    '',
    'src/components/Settings/SettingsPanel.tsx — threshold slider 0.5–0.99 step 0.01 default 0.85 with numeric display; concurrency select 1–5 default 3; render scale select 1.0/1.5/2.0 default 1.5. All bound to store.settings. "Reset to defaults" button. Settings persist automatically.',
    '',
    'src/components/PDFPreview/PdfPreview.tsx — props {item:PDFFileItem}. Render selected page into a canvas via usePDFProcessor.renderPageForPreview. Toolbar: Fit Width / Zoom In / Zoom Out / Prev Page / Next Page / page indicator. Draw detection rect (green) or manual rect (blue) over the canvas using drawDetection. Manual correction: drag to move, resize handle at bottom-right; pointer + touch events; on change store.setManualRect(item.id, pageIndex, rect). Search page by number (input + jump). Keyboard shortcuts: ArrowLeft/ArrowRight prev/next, + / - zoom, f fit width. Show confidence label near rect.',
    '',
    'src/components/DetectionPreview/DetectionPreview.tsx — panel showing latest detection {x,y,width,height,confidence,page} for selected file\'s current page; "Re-run detection" button (runs matchTemplate on current page canvas, stores result); "Clear manual rect" button. Read from store.',
    '',
    'src/components/Toolbar/Toolbar.tsx — top actions: Replace (start via useBulkQueue.start), Cancel (when isProcessing), Download ZIP (enabled when report has processed items; collects resultBlobUrl from processed files, buildZip, downloadZip), Export Report (download JSON of report items via file-saver). Disabled states: Replace requires files.length>0 && oldLogo && newLogo. Toasts via sonner.',
    '',
    'src/components/Queue/ReportDialog.tsx — dialog listing report items with status icons, reasons, durations. "Export" button (calls same export as toolbar).',
    '',
    'src/pages/Dashboard/Dashboard.tsx — responsive layout:',
    '- Top nav: app logo (Lucide FileText or similar), "PDF Logo Replacer" title, ThemeToggle, Help button (store.setHelpOpen(true)).',
    '- Grid: stack on mobile, 2-col on lg, 3-col on xl. Left column: PdfDropzone, old LogoUploader, new LogoUploader, SettingsPanel, Toolbar, BulkProgress, DetectionPreview. Middle/right: PdfPreview (large) + FileList below or in a side panel.',
    '- If no selectedFileId and files exist, auto-select first.',
    '',
    'Keep components small and reusable. Avoid duplicated code. Use cn(). Use Sonner toast for notifications.',
    '',
    'If store needs a setFiles/order action for reordering, add it (do not persist it).',
    '',
    'Run npm run build from ' + ROOT + ' and fix all errors until it passes. Report build status and a tree of src/.',
  ].join('\n')
}

function wiringPrompt() {
  return [
    COMMON,
    '',
    'TASK: Wire the app entry point and final glue.',
    '',
    'src/App.tsx:',
    '- Import Dashboard, Toaster (from components/ui/sonner.tsx), useAppStore theme, useResolvedTheme from Theme/ThemeToggle (or a small helper).',
    '- useEffect on mount: apply resolved theme (add/remove "dark" on documentElement) based on store.theme and system preference; re-apply when store.theme changes; add matchMedia listener for system.',
    '- Wrap in TooltipProvider if tooltips are used (or ensure Dialog/Dropdown providers as needed).',
    '- Render <Dashboard/> and <Toaster/>.',
    '',
    'src/main.tsx: render <App/> with StrictMode; import "./index.css". Keep correct.',
    '',
    'src/components/Help/HelpDialog.tsx — dialog with: how-to steps, supported formats, keyboard shortcuts table, privacy note ("All processing happens in your browser. Files never leave your computer."). Open state from store.ui.helpOpen; close via store.setHelpOpen(false).',
    '',
    'Update Toolbar Help button to call store.setHelpOpen(true). Update Dashboard to render <HelpDialog/>.',
    '',
    'Ensure store already has selectedFileId/setSelectedFileId, ui.helpOpen/setHelpOpen, retryFailed/setRetryFailed (add if missing; keep persist partialize unchanged).',
    '',
    'index.html title must be "PDF Logo Replacer".',
    '',
    'Run npm run build from ' + ROOT + '; fix all errors. Report build status.',
  ].join('\n')
}

function verifyPrompt() {
  return [
    COMMON,
    '',
    'TASK: Final verification pass. From ' + ROOT + ':',
    '1. Run npm run build (tsc --noEmit + vite build). Capture errors.',
    '2. Fix every TS or build error. Proactively check: pdfjs-dist worker ?url import types, cv "any" casts isolated to services/logoDetector.ts with eslint-disable lines, unused vars (noUnusedLocals), ImageBitmap transfer typing in workers, radix scroll-area package present.',
    '3. Do NOT start the dev server (it would block). Just ensure build is green.',
    '4. Produce a final file tree of src/ (find src -type f | sort) and report:',
    '   - build status (pass/fail)',
    '   - any runtime risks you could not verify without a browser',
    '   - the exact command the user should run to start the app: cd "' + ROOT + '" && npm run dev',
    '',
    'Keep the report under 250 words.',
  ].join('\n')
}

phase('Scaffold')
await agent(scaffoldPrompt(), { label: 'scaffold', phase: 'Scaffold' })

phase('Foundation')
await agent(foundationPrompt(), { label: 'foundation', phase: 'Foundation' })

phase('Services')
await agent(servicesPrompt(), { label: 'services', phase: 'Services' })

phase('HooksAndWorkers')
await agent(hooksPrompt(), { label: 'hooks', phase: 'HooksAndWorkers' })

phase('Components')
await agent(componentsPrompt(), { label: 'components', phase: 'Components' })

phase('Wiring')
await agent(wiringPrompt(), { label: 'wiring', phase: 'Wiring' })

phase('Verify')
await agent(verifyPrompt(), { label: 'verify', phase: 'Verify' })