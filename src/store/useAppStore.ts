// Global app store. Only `settings` and `theme` are persisted to localStorage.
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  FileStatus,
  LogoImage,
  PageReplacementMark,
  PDFFileItem,
  ProcessingSettings,
  Rectangle,
  RejectedFile,
  ReportItem,
  Theme,
} from "@/types";
import { DEFAULT_SETTINGS, MAX_PDFS } from "@/types";

interface AppState {
  // Files
  files: PDFFileItem[];
  addFiles: (files: PDFFileItem[]) => void;
  removeFile: (id: string) => void;
  clearFiles: () => void;

  // Rejected files (not accepted into the queue, e.g. over the limit)
  rejectedFiles: RejectedFile[];
  addRejected: (files: RejectedFile[]) => void;
  removeRejected: (id: string) => void;
  clearRejected: () => void;
  setFiles: (files: PDFFileItem[]) => void;
  updateFile: (id: string, patch: Partial<PDFFileItem>) => void;
  setFileStatus: (id: string, status: FileStatus) => void;
  setSelectedPages: (id: string, pages: number[]) => void;
  togglePage: (id: string, pageIndex: number) => void;

  // New logo + per-file replacement marks (only marked pages are replaced).
  // Marks are scoped per file id so a rect drawn on one PDF is not applied to
  // another PDF whose logo sits at a different position. Each mark carries a
  // template image so auto-locate can search the page for the logo at its
  // actual position when alignment varies.
  newLogo: LogoImage | null;
  setNewLogo: (logo: LogoImage | null) => void;
  clearNewLogo: () => void;
  replacementMarksByFile: Record<string, Record<number, PageReplacementMark>>;
  setReplacementMarkForPage: (
    fileId: string,
    pageIndex: number,
    mark: PageReplacementMark,
  ) => void;
  clearReplacementMarkForPage: (fileId: string, pageIndex: number) => void;
  clearReplacementMarks: (fileId?: string) => void;

  // Settings
  settings: ProcessingSettings;
  setConcurrency: (concurrency: number) => void;
  setSmartMatch: (smartMatch: boolean) => void;
  setAutoLocate: (autoLocate: boolean) => void;
  resetSettings: () => void;

  // Theme
  theme: Theme;
  setTheme: (theme: Theme) => void;

  // Processing state
  isProcessing: boolean;
  cancelRequested: boolean;
  startProcessing: () => void;
  cancelProcessing: () => void;
  resetCancel: () => void;

  // Report
  report: ReportItem[];
  addReport: (item: ReportItem) => void;
  clearReport: () => void;

  // Selected file (for detail view)
  selectedFileId: string | null;
  setSelectedFileId: (id: string | null) => void;

  // Preview page index per file id (shared between PdfPreview and the rect panel)
  previewPageById: Record<string, number>;
  setPreviewPage: (id: string, pageIndex: number) => void;

  // UI
  ui: { helpOpen: boolean };
  setHelpOpen: (open: boolean) => void;

  // Retry
  retryFailed: boolean;
  setRetryFailed: (retry: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      files: [],
      addFiles: (incoming) =>
        set((state) => {
          // Hard cap: never let the queue exceed MAX_PDFS, regardless of caller.
          const room = Math.max(0, MAX_PDFS - state.files.length);
          const accepted = room > 0 ? incoming.slice(0, room) : [];
          return { files: [...state.files, ...accepted] };
        }),
      removeFile: (id) =>
        set((state) => {
          const next = { ...state.replacementMarksByFile };
          delete next[id];
          return {
            files: state.files.filter((f) => f.id !== id),
            replacementMarksByFile: next,
          };
        }),
      clearFiles: () => set({ files: [], replacementMarksByFile: {} }),

      rejectedFiles: [],
      addRejected: (incoming) =>
        set((state) => ({ rejectedFiles: [...state.rejectedFiles, ...incoming] })),
      removeRejected: (id) =>
        set((state) => ({
          rejectedFiles: state.rejectedFiles.filter((f) => f.id !== id),
        })),
      clearRejected: () => set({ rejectedFiles: [] }),
      setFiles: (files) => set({ files }),
      updateFile: (id, patch) =>
        set((state) => ({
          files: state.files.map((f) => (f.id === id ? { ...f, ...patch } : f)),
        })),
      setFileStatus: (id, status) =>
        set((state) => ({
          files: state.files.map((f) =>
            f.id === id ? { ...f, status } : f,
          ),
        })),
      setSelectedPages: (id, pages) =>
        set((state) => ({
          files: state.files.map((f) =>
            f.id === id ? { ...f, selectedPages: pages } : f,
          ),
        })),
      togglePage: (id, pageIndex) =>
        set((state) => ({
          files: state.files.map((f) => {
            if (f.id !== id) return f;
            const set2 = new Set(f.selectedPages);
            if (set2.has(pageIndex)) set2.delete(pageIndex);
            else set2.add(pageIndex);
            return { ...f, selectedPages: [...set2].sort((a, b) => a - b) };
          }),
        })),

      newLogo: null,
      setNewLogo: (logo) => set({ newLogo: logo }),
      clearNewLogo: () => set({ newLogo: null }),
      replacementMarksByFile: {},
      setReplacementMarkForPage: (fileId, pageIndex, mark) =>
        set((state) => {
          const fileMarks = {
            ...(state.replacementMarksByFile[fileId] ?? {}),
          };
          fileMarks[pageIndex] = mark;
          return {
            replacementMarksByFile: {
              ...state.replacementMarksByFile,
              [fileId]: fileMarks,
            },
          };
        }),
      clearReplacementMarkForPage: (fileId, pageIndex) =>
        set((state) => {
          const fileMarks = state.replacementMarksByFile[fileId];
          if (!fileMarks) return state;
          const nextFileMarks = { ...fileMarks };
          delete nextFileMarks[pageIndex];
          const next = { ...state.replacementMarksByFile };
          if (Object.keys(nextFileMarks).length === 0) {
            delete next[fileId];
          } else {
            next[fileId] = nextFileMarks;
          }
          return { replacementMarksByFile: next };
        }),
      clearReplacementMarks: (fileId) =>
        set((state) => {
          if (fileId == null) return { replacementMarksByFile: {} };
          if (!state.replacementMarksByFile[fileId]) return state;
          const next = { ...state.replacementMarksByFile };
          delete next[fileId];
          return { replacementMarksByFile: next };
        }),

      settings: { ...DEFAULT_SETTINGS },
      setConcurrency: (concurrency) =>
        set((state) => ({ settings: { ...state.settings, concurrency } })),
      setSmartMatch: (smartMatch) =>
        set((state) => ({ settings: { ...state.settings, smartMatch } })),
      setAutoLocate: (autoLocate) =>
        set((state) => ({ settings: { ...state.settings, autoLocate } })),
      resetSettings: () => set({ settings: { ...DEFAULT_SETTINGS } }),

      theme: "system",
      setTheme: (theme) => set({ theme }),

      isProcessing: false,
      cancelRequested: false,
      startProcessing: () => set({ isProcessing: true, cancelRequested: false }),
      cancelProcessing: () => set({ cancelRequested: true }),
      resetCancel: () => set({ cancelRequested: false, isProcessing: false }),

      report: [],
      addReport: (item) => set((state) => ({ report: [...state.report, item] })),
      clearReport: () => set({ report: [] }),

      selectedFileId: null,
      setSelectedFileId: (id) => set({ selectedFileId: id }),
      previewPageById: {},
      setPreviewPage: (id, pageIndex) =>
        set((state) => ({
          previewPageById: { ...state.previewPageById, [id]: pageIndex },
        })),

      ui: { helpOpen: false },
      setHelpOpen: (helpOpen) => set((state) => ({ ui: { ...state.ui, helpOpen } })),

      retryFailed: false,
      setRetryFailed: (retry) => set({ retryFailed: retry }),
    }),
    {
      name: "pdf-logo-replacer",
      partialize: (state) => ({ settings: state.settings, theme: state.theme }),
      merge: (persisted, current) => {
        const stored = persisted as Partial<AppState> | undefined;
        return {
          ...current,
          ...stored,
          settings: { ...DEFAULT_SETTINGS, ...stored?.settings },
        };
      },
    },
  ),
);

// Re-export commonly used types for convenience.
export type {
  PDFFileItem,
  PageReplacementMark,
  ProcessingSettings,
  Rectangle,
  RejectedFile,
  ReportItem,
  Theme,
};