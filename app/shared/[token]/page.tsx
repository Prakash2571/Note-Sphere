/**
 * app/shared/[token]/page.tsx
 * Public shared note page — accessible to anyone with the share link.
 * Shows PDF preview and AI summary (if generated). No login required.
 */

"use client";

import { useState, useEffect } from "react";
import {
  BookOpen,
  FileText,
  Sparkles,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  Tag,
} from "lucide-react";
import Link from "next/link";
import { PDFPreviewModal } from "@/components/modals/PDFPreviewModal";
import { formatDate, formatFileSize } from "@/lib/utils";

interface Label {
  _id: string;
  name: string;
  color: string;
}

interface SharedNote {
  title: string;
  description: string;
  labels: Label[];
  summary?: string;
  isSummarized: boolean;
  fileSize: number;
  pageCount?: number;
  createdAt: string;
}

export default function SharedNotePage({
  params,
}: {
  params: { token: string };
}) {
  const [note, setNote] = useState<SharedNote | null>(null);
  const [presignedUrl, setPresignedUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [showPdf, setShowPdf] = useState(false);
  const [showSummary, setShowSummary] = useState(true);

  useEffect(() => {
    async function loadSharedNote() {
      try {
        const res = await fetch(`/api/shared/${params.token}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Failed to load note.");
          return;
        }

        setNote(data.note);
        setPresignedUrl(data.presignedUrl);
      } catch {
        setError("Failed to load the shared note. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }

    loadSharedNote();
  }, [params.token]);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Loading shared note...</p>
        </div>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error || !note) {
    return (
      <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center px-4">
        <div className="bg-[#111827] border border-[#1e2d45] rounded-2xl p-8 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Note Not Found</h2>
          <p className="text-slate-400 text-sm mb-6">
            {error || "This share link is invalid or has been revoked."}
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-500 text-white px-6 py-2.5 rounded-xl font-medium text-sm"
          >
            <BookOpen className="w-4 h-4" />
            Go to Note-Sphere
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-[#0a0f1e]">
        {/* ── Nav bar ─── */}
        <nav className="bg-[#0d1526] border-b border-[#1e2d45] px-6 py-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-red-500 to-blue-600 flex items-center justify-center">
                <BookOpen className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-bold bg-gradient-to-r from-red-400 to-blue-400 bg-clip-text text-transparent">
                Note-Sphere
              </span>
            </Link>
            <Link
              href="/auth/signup"
              className="text-sm bg-gradient-to-r from-red-600 to-red-500 text-white px-4 py-1.5 rounded-lg font-medium"
            >
              Create Free Account
            </Link>
          </div>
        </nav>

        {/* ── Content ─── */}
        <main className="max-w-4xl mx-auto px-6 py-10">
          {/* Shared badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full text-green-400 text-xs font-medium mb-6">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Publicly shared note
          </div>

          {/* Note header */}
          <div className="bg-[#111827] border border-[#1e2d45] rounded-2xl p-6 mb-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
                <FileText className="w-6 h-6 text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold text-white mb-1">{note.title}</h1>
                {note.description && (
                  <p className="text-slate-400 text-sm leading-relaxed">{note.description}</p>
                )}
                <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-slate-500">
                  <span>{formatFileSize(note.fileSize)}</span>
                  {note.pageCount && <span>{note.pageCount} pages</span>}
                  <span>Uploaded {formatDate(note.createdAt)}</span>
                </div>

                {/* Labels */}
                {note.labels.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {note.labels.map((label) => (
                      <span
                        key={label._id}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: `${label.color}20`,
                          color: label.color,
                          border: `1px solid ${label.color}30`,
                        }}
                      >
                        <Tag className="w-2.5 h-2.5" />
                        {label.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Preview button */}
            <button
              onClick={() => setShowPdf(true)}
              className="mt-5 flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-all shadow-lg shadow-blue-900/30"
            >
              <Eye className="w-4 h-4" />
              Preview PDF
            </button>
          </div>

          {/* AI Summary section */}
          {note.isSummarized && note.summary && (
            <div className="bg-[#111827] border border-[#1e2d45] rounded-2xl overflow-hidden">
              <div
                className="flex items-center justify-between px-6 py-4 border-b border-[#1e2d45] cursor-pointer hover:bg-[#1a2235] transition-colors"
                onClick={() => setShowSummary(!showSummary)}
              >
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-purple-500/15 border border-purple-500/20 flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  </div>
                  <span className="text-sm font-semibold text-white">AI Summary</span>
                  <span className="text-xs text-slate-500">by Google Gemini</span>
                </div>
                {showSummary ? (
                  <EyeOff className="w-4 h-4 text-slate-500" />
                ) : (
                  <Eye className="w-4 h-4 text-slate-500" />
                )}
              </div>

              {showSummary && (
                <div className="p-6">
                  <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {note.summary}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CTA for non-summarized notes */}
          {!note.isSummarized && (
            <div className="bg-[#111827] border border-[#1e2d45] rounded-2xl p-6 text-center">
              <Sparkles className="w-8 h-8 text-purple-400 mx-auto mb-3" />
              <p className="text-slate-400 text-sm mb-4">
                Want AI summaries for your own PDFs?
              </p>
              <Link
                href="/auth/signup"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-500 text-white px-5 py-2.5 rounded-xl font-medium text-sm"
              >
                Try Note-Sphere Free
              </Link>
            </div>
          )}
        </main>
      </div>

      {/* PDF Preview Modal */}
      {showPdf && (
        <PDFPreviewModal
          note={{ _id: "", title: note.title, s3Key: "" }}
          onClose={() => setShowPdf(false)}
          presignedUrl={presignedUrl}
        />
      )}
    </>
  );
}
