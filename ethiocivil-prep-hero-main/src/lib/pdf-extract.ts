// Client-side PDF text extraction with OCR fallback for scanned PDFs.
import * as pdfjs from "pdfjs-dist";
// @ts-ignore - vite worker import
import workerSrc from "pdfjs-dist/build/pdf.worker.mjs?url";

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

export type ExtractOptions = {
  onProgress?: (pct: number, stage?: string) => void;
  ocrIfEmpty?: boolean; // default true
  ocrLang?: string; // default "eng"
};

export async function extractPdfText(file: File, opts?: ExtractOptions | ((pct: number) => void)): Promise<string> {
  const options: ExtractOptions = typeof opts === "function" ? { onProgress: opts } : (opts ?? {});
  const { onProgress, ocrIfEmpty = true, ocrLang = "eng" } = options;

  const buf = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buf }).promise;
  const out: string[] = [];
  let totalChars = 0;
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map((it: any) => ("str" in it ? it.str : "")).join(" ");
    out.push(text);
    totalChars += text.trim().length;
    onProgress?.((i / pdf.numPages) * 0.5, "Reading text");
  }

  // If there's barely any embedded text, it's likely a scanned PDF — run OCR.
  const avgPerPage = totalChars / Math.max(pdf.numPages, 1);
  if (ocrIfEmpty && avgPerPage < 40) {
    onProgress?.(0.5, "Scanned PDF detected — running OCR…");
    const ocrText = await ocrPdf(pdf, ocrLang, (p) => onProgress?.(0.5 + p * 0.5, "OCR"));
    return ocrText;
  }
  return out.join("\n\n");
}

async function ocrPdf(pdf: any, lang: string, onProgress?: (pct: number) => void): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker(lang);
  const chunks: string[] = [];
  try {
    const maxPages = Math.min(pdf.numPages, 30); // cap to keep browser responsive
    for (let i = 1; i <= maxPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d")!;
      await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;
      const { data } = await worker.recognize(canvas);
      chunks.push(`--- Page ${i} ---\n${data.text}`);
      onProgress?.(i / maxPages);
      canvas.width = 0; canvas.height = 0;
    }
  } finally {
    await worker.terminate();
  }
  return chunks.join("\n\n");
}
