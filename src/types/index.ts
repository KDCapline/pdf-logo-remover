// Core domain types for PDF Logo Replacer.
// All PDF processing is client-side; these types are shared by UI and services.

export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * A user-drawn replacement mark: the drawn rectangle plus a template image
 * (PNG data URL) captured from the page at draw time. The template lets
 * auto-locate search the page for the logo at its actual position when the
 * same page index has the logo at different coordinates across PDFs.
 */
export interface PageReplacementMark {
  rect: Rectangle;
  templateDataUrl: string;
}

export interface LogoImage {
  id: string;
  file: File;
  name: string;
  dataUrl: string;
  width: number;
  height: number;
  imageBitmap?: ImageBitmap;
}

export type FileStatus =
  | "pending"
  | "queued"
  | "processing"
  | "processed"
  | "skipped"
  | "error"
  | "canceled";

export interface PDFFileItem {
  id: string;
  file: File;
  name: string;
  size: number;
  pageCount: number;
  thumbnailUrl: string | null;
  status: FileStatus;
  progress: number;
  currentPage: number;
  error?: string;
  reason?: string;
  resultBlobUrl?: string;
  selectedPages: number[];
}

export interface ProcessingSettings {
  /** Maximum number of PDFs processed in parallel. */
  concurrency: number;
  /**
   * When true, each PDF is scanned so only marked pages that actually contain
   * logo-like content at the drawn rectangle are replaced.
   */
  smartMatch: boolean;
  /**
   * When true, pages where smart match fails are searched for the drawn
   * template (hint neighbourhood first, then full page) so a rough mark still
   * lands on the logo when alignment varies across PDFs.
   */
  autoLocate: boolean;
}

export interface ReportItem {
  name: string;
  status: "processed" | "skipped" | "error";
  reason?: string;
  durationMs?: number;
}

/** A file that was not accepted into the queue (e.g. exceeds the limit). */
export interface RejectedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  reason: string;
}

export type Theme = "light" | "dark" | "system";

export const DEFAULT_SETTINGS: ProcessingSettings = {
  concurrency: 3,
  smartMatch: true,
  autoLocate: false,
};

/** Maximum number of PDFs allowed in the queue at one time. */
export const MAX_PDFS = 50;