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

import { AnnotationOverlay } from "./AnnotationOverlay";
import type { NormPoint, NormRect } from "@/lib/annotations/coordinates";
import type { PaletteColor } from "@/lib/annotations/validation";
import type { Tool } from "@/lib/annotations/colorState";
import type { AnnotationDTO } from "@/lib/annotations/serialize";

/**
 * Production-safe worker setup
 */
pdfjs.GlobalWorkerOptions.workerSrc =
  new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();

/**
 * Module scope — stable identity so react-pdf does not reload the document.
 * With disableAutoFetch, pdf.js requests only the byte ranges needed for the
 * current page instead of eagerly downloading the whole file.
 */
const PDF_OPTIONS = {
  disableAutoFetch: true,
  disableStream: true,
  rangeChunkSize: 262144,
} as const;

interface PageDimensions {
  unscaledWidth: number;
  unscaledHeight: number;
}

interface PDFDocumentProps {
  pdfUrl?: string;

  pdfData?: Uint8Array;

  onFirstRender?: () => void;

  currentPage: number;

  scale: number;

  containerWidth?: number;

  onLoadSuccess: ({
    numPages,
  }: {
    numPages: number;
  }) => void;

  onLoadError: (
    error: Error
  ) => void;

  /* Annotation integration (all optional so existing callers keep working) */
  pageAnnotations?: AnnotationDTO[];
  tool?: Tool;
  activeColor?: PaletteColor;
  strokeWidth?: number;
  onPageDimensions?: (dims: PageDimensions) => void;
  onCreateHighlight?: (rects: NormRect[]) => void;
  onCreateScribble?: (points: NormPoint[]) => void;
  onErase?: (annotationId: string) => void;
  unscaledWidth?: number;
  unscaledHeight?: number;
}

export function PDFDocument({
  pdfUrl,
  pdfData,
  onFirstRender,
  currentPage,
  scale,
  containerWidth,
  onLoadSuccess,
  onLoadError,
  pageAnnotations = [],
  tool = "none",
  activeColor,
  strokeWidth = 3,
  onPageDimensions,
  onCreateHighlight,
  onCreateScribble,
  onErase,
  unscaledWidth,
  unscaledHeight,
}: PDFDocumentProps) {
  /**
   * Prevent unnecessary rerenders
   */
  const file = useMemo(
    () => (pdfData ? { data: pdfData } : pdfUrl ? { url: pdfUrl } : null),
    [pdfData, pdfUrl]
  );

  const annotationsEnabled =
    onCreateHighlight !== undefined &&
    onCreateScribble !== undefined &&
    activeColor !== undefined;

  const hasDims =
    typeof unscaledWidth === "number" &&
    typeof unscaledHeight === "number" &&
    unscaledWidth > 0 &&
    unscaledHeight > 0;

  /**
   * Container-relative (fit-to-width) baseline. When the viewer has measured
   * its available content width, render the page by width so 100% fits the
   * container and zoom visibly resizes; otherwise fall back to raw scale.
   */
  // Keep a readable page width on large screens while fitting narrow viewports.
  const fitWidth =
    containerWidth && containerWidth > 0
      ? Math.min(containerWidth, 960)
      : undefined;
  const pageWidth = fitWidth ? Math.max(fitWidth * scale, 100) : undefined;
  const overlayScale =
    pageWidth && typeof unscaledWidth === "number" && unscaledWidth > 0
      ? pageWidth / unscaledWidth
      : scale;

  // Render text/vector content sharply without allocating huge canvases at high zoom.
  const deviceDpr =
    typeof window !== "undefined" ? window.devicePixelRatio || 1 : 2;
  const renderDpr = Math.max(
    1,
    Math.min(Math.max(deviceDpr, 2), 3, 3200 / (pageWidth ?? 960))
  );

  if (file === null) {
    return null;
  }

  return (
    <Document
      file={file}
      options={PDF_OPTIONS}
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
      <div
        className="relative"
        style={
          tool !== "none"
            ? {
                userSelect: "none",
                WebkitUserSelect: "none",
                touchAction: "none",
              }
            : undefined
        }
      >
        <Page
          key={currentPage}
          pageNumber={currentPage}
          width={pageWidth}
          scale={pageWidth ? undefined : scale}
          renderMode="canvas"
          devicePixelRatio={renderDpr}
          renderTextLayer={true}
          renderAnnotationLayer={
            true
          }
          loading={
            <div role="status" className="p-10 text-slate-400">
              Loading page {currentPage}...
            </div>
          }
          onLoadError={onLoadError}
          onRenderError={onLoadError}
          onRenderSuccess={(page) => {
            if (page.pageNumber !== currentPage) return;
            const viewport = page.getViewport({ scale: 1 });
            onPageDimensions?.({
              unscaledWidth: viewport.width,
              unscaledHeight: viewport.height,
            });
            onFirstRender?.();
          }}
          className="overflow-hidden rounded-xl shadow-2xl"
        />

        {annotationsEnabled && hasDims && (
          <AnnotationOverlay
            annotations={pageAnnotations}
            pageNumber={currentPage}
            scale={overlayScale}
            unscaledWidth={unscaledWidth as number}
            unscaledHeight={unscaledHeight as number}
            tool={tool}
            activeColor={activeColor as PaletteColor}
            strokeWidth={strokeWidth}
            onCreateHighlight={onCreateHighlight as (r: NormRect[]) => void}
            onCreateScribble={onCreateScribble as (p: NormPoint[]) => void}
            onErase={onErase}
          />
        )}
      </div>
    </Document>
  );
}
