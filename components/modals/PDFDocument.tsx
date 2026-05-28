/**
 * components/modals/PDFDocument.tsx
 */

"use client";

import { useMemo } from "react";

import {
  Document,
  Page,
  pdfjs,
} from "react-pdf";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

/**
 * Worker setup
 */
pdfjs.GlobalWorkerOptions.workerSrc =
  `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFDocumentProps {
  pdfUrl: string;

  currentPage: number;

  scale: number;

  onLoadSuccess: ({
    numPages,
  }: {
    numPages: number;
  }) => void;

  onLoadError: (
    error: Error
  ) => void;
}

export function PDFDocument({
  pdfUrl,
  currentPage,
  scale,
  onLoadSuccess,
  onLoadError,
}: PDFDocumentProps) {
  /**
   * Prevent unnecessary rerenders
   */
  const file = useMemo(
    () => ({
      url: pdfUrl,
    }),
    [pdfUrl]
  );

  return (
    <Document
      file={file}
      onLoadSuccess={
        onLoadSuccess
      }
      onLoadError={
        onLoadError
      }
      loading={
        <div className="flex items-center justify-center p-10 text-slate-400">
          Loading PDF...
        </div>
      }
      error={
        <div className="flex items-center justify-center p-10 text-red-400">
          Failed to load PDF
        </div>
      }
      className="flex justify-center"
    >
      <Page
        pageNumber={currentPage}
        scale={scale}
        renderMode="canvas"
        devicePixelRatio={
          typeof window !==
          "undefined"
            ? Math.max(
                window.devicePixelRatio,
                2
              )
            : 2
        }
        renderTextLayer={true}
        renderAnnotationLayer={
          true
        }
        className="overflow-hidden rounded-xl shadow-2xl"
      />
    </Document>
  );
}