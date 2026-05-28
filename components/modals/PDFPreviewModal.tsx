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

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0b1120]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 bg-[#0f172a] px-3 py-3 sm:px-5">
        {/* Left */}
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={onClose}
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
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}