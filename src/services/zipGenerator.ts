// ZIP packaging using JSZip + file-saver. Browser-only, no node deps.
import JSZip from "jszip";
import { saveAs } from "file-saver";

export interface ZipItem {
  name: string;
  blob: Blob;
}

/** Strip a trailing .pdf and append `_updated.pdf`. */
function makeUpdatedName(original: string): string {
  const stripped = original.replace(/\.pdf$/i, "");
  return `${stripped}_updated.pdf`;
}

/**
 * Build a zip archive from the provided blobs. Reports progress in [0, 1]
 * via `onProgress` (JSZip calls its update callback with metadata).
 */
export async function buildZip(
  items: ZipItem[],
  onProgress?: (p: number) => void,
): Promise<Blob> {
  const zip = new JSZip();
  for (const item of items) {
    zip.file(makeUpdatedName(item.name), item.blob);
  }
  return await zip.generateAsync(
    {
      type: "blob",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    },
    (meta) => {
      onProgress?.(meta.percent / 100);
    },
  );
}

/** Trigger a browser download of the zip. */
export function downloadZip(blob: Blob, name = "pdfs_updated.zip"): void {
  saveAs(blob, name);
}