// Core domain types for PDF Logo Replacer.
// All PDF processing is client-side; these types are shared by UI and services.

export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
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
};

/** Maximum number of PDFs allowed in the queue at one time. */
export const MAX_PDFS = 50;