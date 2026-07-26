/**
 * components/modals/PDFPreviewModal.tsx
 */

"use client";

import { useEffect, useState } from "react";

import dynamic from "next/dynamic";

import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import { AnnotationToolbar } from "./AnnotationToolbar";
import { useAnnotations } from "./useAnnotations";
import { useHistoryBackClose } from "./useHistoryBackClose";
import {
  DEFAULT_COLOR_STATE,
  selectColor,
  activeColorFor,
  type ColorState,
  type Tool,
} from "@/lib/annotations/colorState";
import type { PaletteColor } from "@/lib/annotations/validation";
import type { NormPoint, NormRect } from "@/lib/annotations/coordinates";

const PDFDocument = dynamic(
  () =>
    import("./PDFDocument").then(
      (mod) => mod.PDFDocument
    ),
  {
    ssr: false,
  }
);

interface Note {
  _id: string;
  title: string;
  s3Key: string;
}

interface PDFPreviewModalProps {
  note: Note;
  onClose: () => void;
  presignedUrl?: string;
}

export function PDFPreviewModal({
  note,
  onClose,
  presignedUrl: externalUrl,
}: PDFPreviewModalProps) {
  const [pdfUrl, setPdfUrl] =
    useState<string | null>(
      externalUrl || null
    );

  const [numPages, setNumPages] =
    useState(0);

  const [currentPage, setCurrentPage] =
    useState(1);

  const [scale, setScale] =
    useState(1);

  const [isLoading, setIsLoading] =
    useState(!externalUrl);

  const [error, setError] =
    useState("");

  /* Annotation state */
  const [tool, setTool] = useState<Tool>("none");

  const [colorState, setColorState] =
    useState<ColorState>(DEFAULT_COLOR_STATE);

  const [strokeWidth, setStrokeWidth] =
    useState(3);

  const [pageDims, setPageDims] = useState<{
    unscaledWidth: number;
    unscaledHeight: number;
  } | null>(null);

  const annotations = useAnnotations(note._id);

  /* Own a browser history entry so mobile/hardware Back closes the viewer
     instead of leaving the app. The modal only mounts when open, so `active`
     is effectively always true for its lifetime. */
  const { closeWithHistory } = useHistoryBackClose(true, onClose);

  const activeColor: PaletteColor = activeColorFor(colorState, tool);

  /* Fetch signed URL */
  useEffect(() => {
    if (externalUrl) return;

    async function loadPdf() {
      try {
        const res = await fetch(
          `/api/notes/${note._id}`
        );

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error);
        }

        setPdfUrl(
          data.presignedUrl
        );
      } catch {
        setError(
          "Failed to load PDF. Please try again."
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadPdf();
  }, [note._id, externalUrl]);

  /* PDF loaded */
  function onDocumentLoadSuccess({
    numPages,
  }: {
    numPages: number;
  }) {
    setNumPages(numPages);

    setIsLoading(false);
  }

  /* PDF failed */
  function onDocumentLoadError() {
    setError(
      "Failed to render PDF. The file may be corrupted."
    );

    setIsLoading(false);
  }

  /* Zoom */
  function zoomIn() {
    setScale((prev) =>
      Math.min(prev + 0.2, 2.5)
    );
  }

  function zoomOut() {
    setScale((prev) =>
      Math.max(prev - 0.2, 0.6)
    );
  }

  /* Annotation handlers */
  function handleColorChange(
    target: "highlight" | "scribble",
    color: PaletteColor
  ) {
    setColorState((prev) => selectColor(prev, { tool: target, color }));
  }

  function handleJumpToPage(page: number) {
    setCurrentPage(page);
  }

  function handleCreateHighlight(rects: NormRect[]) {
    annotations.createHighlight(currentPage, rects, colorState.highlight);
  }

  function handleCreateScribble(points: NormPoint[]) {
    annotations.createScribble(
      currentPage,
      points,
      colorState.scribble,
      strokeWidth
    );
  }

  const pageAnnotations = annotations.byPage(currentPage);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0b1120]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 bg-[#0f172a] px-3 py-3 sm:px-5">
        {/* Left */}
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={closeWithHistory}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-white/5 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="min-w-0">
            <h2 className="truncate text-sm font-medium text-white">
              {note.title}
            </h2>

            {numPages > 0 && (
              <p className="text-xs text-slate-500">
                {currentPage} of{" "}
                {numPages} pages
              </p>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Zoom out */}
          <button
            onClick={zoomOut}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-white/5 hover:text-white"
          >
            <ZoomOut className="h-4 w-4" />
          </button>

          {/* Scale */}
          <div className="w-12 text-center text-xs text-slate-400">
            {Math.round(scale * 100)}
            %
          </div>

          {/* Zoom in */}
          <button
            onClick={zoomIn}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-white/5 hover:text-white"
          >
            <ZoomIn className="h-4 w-4" />
          </button>

          {/* Divider */}
          <div className="mx-1 h-5 w-px bg-white/10" />

          {/* Previous */}
          <button
            onClick={() =>
              setCurrentPage((prev) =>
                Math.max(prev - 1, 1)
              )
            }
            disabled={currentPage <= 1}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-white/5 hover:text-white disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {/* Next */}
          <button
            onClick={() =>
              setCurrentPage((prev) =>
                Math.min(
                  prev + 1,
                  numPages
                )
              )
            }
            disabled={
              currentPage >= numPages
            }
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-white/5 hover:text-white disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Annotation toolbar */}
      {pdfUrl && !error && (
        <div className="flex items-center justify-between gap-3 overflow-x-auto border-b border-white/10 bg-[#0f172a]/60 px-3 py-2 sm:px-5">
          <AnnotationToolbar
            tool={tool}
            onToolChange={setTool}
            highlightColor={colorState.highlight}
            scribbleColor={colorState.scribble}
            onColorChange={handleColorChange}
            strokeWidth={strokeWidth}
            onStrokeWidthChange={setStrokeWidth}
            onRevert={annotations.revertAll}
            onUndo={annotations.undo}
            onRedo={annotations.redo}
            canUndo={annotations.canUndo}
            canRedo={annotations.canRedo}
            totalPages={numPages}
            onJumpToPage={handleJumpToPage}
          />

          {annotations.error && (
            <span role="alert" className="text-xs text-red-400">
              {annotations.error}
            </span>
          )}
        </div>
      )}

      {/* Viewer */}
      <div className="flex-1 overflow-auto bg-[#0b1120] p-3 sm:p-6">
        <div className="flex justify-center">
          {/* Loading */}
          {isLoading &&
          !pdfUrl ? (
            <div className="mt-20 flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-blue-400" />

              <p className="text-sm text-slate-400">
                Loading PDF...
              </p>
            </div>
          ) : error ? (
            /* Error */
            <div className="mt-20 flex flex-col items-center gap-3 text-center">
              <AlertCircle className="h-10 w-10 text-red-400" />

              <p className="max-w-sm text-sm text-slate-400">
                {error}
              </p>
            </div>
          ) : pdfUrl ? (
            /* PDF */
            <PDFDocument
              pdfUrl={pdfUrl}
              currentPage={
                currentPage
              }
              scale={scale}
              onLoadSuccess={
                onDocumentLoadSuccess
              }
              onLoadError={
                onDocumentLoadError
              }
              pageAnnotations={pageAnnotations}
              tool={tool}
              activeColor={activeColor}
              strokeWidth={strokeWidth}
              onPageDimensions={setPageDims}
              onCreateHighlight={handleCreateHighlight}
              onCreateScribble={handleCreateScribble}
              onErase={annotations.deleteOne}
              unscaledWidth={pageDims?.unscaledWidth}
              unscaledHeight={pageDims?.unscaledHeight}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
