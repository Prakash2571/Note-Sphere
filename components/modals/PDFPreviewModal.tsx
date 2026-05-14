/**
 * components/modals/PDFPreviewModal.tsx
 * Full-screen modal for previewing a PDF using react-pdf.
 * Fetches a fresh pre-signed S3 URL before rendering.
 */

"use client";

import { useState, useEffect } from "react";
import { X, ChevronLeft, ChevronRight, Loader2, AlertCircle, ZoomIn, ZoomOut } from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Set the PDF.js worker source
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface Note {
  _id: string;
  title: string;
  s3Key: string;
}

interface PDFPreviewModalProps {
  note: Note;
  onClose: () => void;
  presignedUrl?: string; // If passed from public share page
}

export function PDFPreviewModal({ note, onClose, presignedUrl: externalUrl }: PDFPreviewModalProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(externalUrl || null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [isLoading, setIsLoading] = useState(!externalUrl);
  const [error, setError] = useState("");

  // Fetch a fresh pre-signed URL if not provided externally
  useEffect(() => {
    if (externalUrl) return;

    async function fetchPresignedUrl() {
      try {
        const res = await fetch(`/api/notes/${note._id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setPdfUrl(data.presignedUrl);
      } catch (err) {
        setError("Failed to load PDF. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchPresignedUrl();
  }, [note._id, externalUrl]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setIsLoading(false);
  }

  function onDocumentLoadError() {
    setError("Failed to render PDF. The file may be corrupted or inaccessible.");
    setIsLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0a0f1e]">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-3 bg-[#0d1526] border-b border-[#1e2d45]">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-[#1a2235] transition-all flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-sm font-semibold text-white truncate">{note.title}</h2>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <button
            onClick={() => setScale((s) => Math.max(0.5, s - 0.25))}
            className="p-2 rounded-lg bg-[#1a2235] hover:bg-[#1e2a42] text-slate-400 hover:text-white transition-all"
            title="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs text-slate-400 w-12 text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => setScale((s) => Math.min(2.5, s + 0.25))}
            className="p-2 rounded-lg bg-[#1a2235] hover:bg-[#1e2a42] text-slate-400 hover:text-white transition-all"
            title="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          {/* Page navigation */}
          {numPages > 0 && (
            <div className="flex items-center gap-2 ml-3 pl-3 border-l border-[#1e2d45]">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="p-1.5 rounded-lg bg-[#1a2235] hover:bg-[#1e2a42] text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-slate-400 whitespace-nowrap">
                {currentPage} / {numPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
                disabled={currentPage >= numPages}
                className="p-1.5 rounded-lg bg-[#1a2235] hover:bg-[#1e2a42] text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* PDF viewer area */}
      <div className="flex-1 overflow-auto bg-[#0a0f1e] flex items-start justify-center p-6">
        {isLoading && !pdfUrl ? (
          <div className="flex flex-col items-center gap-3 mt-20">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
            <p className="text-slate-400 text-sm">Loading PDF...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 mt-20">
            <AlertCircle className="w-10 h-10 text-red-400" />
            <p className="text-slate-400 text-sm">{error}</p>
          </div>
        ) : pdfUrl ? (
          <Document
            file={pdfUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={
              <div className="flex items-center gap-2 text-slate-400 mt-20">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">Rendering PDF...</span>
              </div>
            }
          >
            <Page
              pageNumber={currentPage}
              scale={scale}
              className="shadow-2xl rounded"
              renderTextLayer={true}
              renderAnnotationLayer={true}
            />
          </Document>
        ) : null}
      </div>
    </div>
  );
}
