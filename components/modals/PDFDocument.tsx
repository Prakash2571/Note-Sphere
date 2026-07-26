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

interface PageDimensions {
  unscaledWidth: number;
  unscaledHeight: number;
}

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
  currentPage,
  scale,
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
    () => ({
      url: pdfUrl,
    }),
    [pdfUrl]
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
          onRenderSuccess={(page) => {
            const viewport = page.getViewport({ scale: 1 });
            onPageDimensions?.({
              unscaledWidth: viewport.width,
              unscaledHeight: viewport.height,
            });
          }}
          className="overflow-hidden rounded-xl shadow-2xl"
        />

        {annotationsEnabled && hasDims && (
          <AnnotationOverlay
            annotations={pageAnnotations}
            pageNumber={currentPage}
            scale={scale}
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
