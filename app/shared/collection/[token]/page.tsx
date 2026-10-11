"use client";

import { use, useEffect, useState } from "react";

import Link from "next/link";

import {
  AlertCircle,
  BookOpen,
  ChevronRight,
  Download,
  Eye,
  FileText,
  Files,
  Loader2,
  Sparkles,
  Tag,
} from "lucide-react";

import { PDFPreviewModal } from "@/components/modals/PDFPreviewModal";

import { formatDate, formatFileSize } from "@/lib/utils";

interface Label {
  _id: string;
  name: string;
  color: string;
}

interface SharedNote {
  _id: string;
  title: string;
  description: string;
  labels: Label[];
  summary?: string;
  isSummarized: boolean;
  fileSize: number;
  pageCount?: number;
  createdAt: string;
  previewUrl: string;
}

interface ApiResponse {
  title: string;
  count: number;
  createdAt: string;
  notes: SharedNote[];
}

interface SharedCollectionPageProps {
  params: Promise<{ token: string }>;
}

export default function SharedCollectionPage({
  params,
}: SharedCollectionPageProps) {
  const { token } = use(params);

  const [data, setData] = useState<ApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  /* The note currently open in the PDF preview modal */
  const [previewNote, setPreviewNote] = useState<SharedNote | null>(null);

  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<{ id: string; message: string } | null>(null);

  async function downloadNote(note: SharedNote) {
    setDownloadingId(note._id);
    setDownloadError(null);
    try {
      const response = await fetch(note.previewUrl);
      if (!response.ok) throw new Error("The download link expired. Refresh the page and try again.");
      const objectUrl = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      const name = note.title.replace(/[<>:"/\\|?*\x00-\x1f]/g, "").trim().slice(0, 120) || "document";
      link.href = objectUrl;
      link.download = name.toLowerCase().endsWith(".pdf") ? name : name + ".pdf";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch (error) {
      setDownloadError({
        id: note._id,
        message: error instanceof Error ? error.message : "Download failed.",
      });
    } finally {
      setDownloadingId(null);
    }
  }

  useEffect(() => {
    async function loadCollection() {
      try {
        setIsLoading(true);

        const res = await fetch(`/api/shared/collection/${token}`, {
          cache: "no-store",
        });

        const json: ApiResponse & { error?: string } = await res.json();

        if (!res.ok) {
          throw new Error(json.error || "Failed to load shared PDFs.");
        }

        setData(json);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Something went wrong."
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadCollection();
  }, [token]);

  /* Loading */
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#020817] px-4">
        <div className="text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl border border-white/10 bg-[#111827]">
            <Loader2 className="h-7 w-7 animate-spin text-blue-400" />
          </div>

          <h2 className="text-lg font-semibold text-white">
            Loading shared PDFs
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Fetching files and metadata...
          </p>
        </div>
      </div>
    );
  }

  /* Error */
  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#020817] px-4">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#111827] p-6 text-center sm:p-8">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-red-500/10">
            <AlertCircle className="h-8 w-8 text-red-400" />
          </div>

          <h1 className="text-2xl font-bold text-white">
            These PDFs are unavailable
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-400">
            {error ||
              "This shared link no longer exists or was revoked by its owner."}
          </p>

          <Link
            href="/"
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-blue-500"
          >
            <BookOpen className="h-4 w-4" />
            Go to NoteSphere
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-[#020817] text-white">
        {/* NAVBAR */}
        <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#020817]/90 backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-linear-to-br from-red-500 to-blue-600 shadow-lg shadow-blue-500/20">
                <BookOpen className="h-5 w-5 text-white" />
              </div>

              <div>
                <p className="text-base font-semibold tracking-tight text-white">
                  NoteSphere
                </p>
                <p className="text-xs text-slate-500">AI PDF Workspace</p>
              </div>
            </Link>

            <Link
              href="/auth/signup"
              className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500"
            >
              Get Started
            </Link>
          </div>
        </nav>

        {/* HERO */}
        <div className="border-b border-white/10 bg-linear-to-b from-blue-500/5 to-transparent">
          <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
            <div className="inline-flex items-center gap-2 rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1 text-xs font-medium text-green-400">
              <div className="h-2 w-2 rounded-full bg-green-400" />
              Public shared collection
            </div>

            <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-start">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl border border-blue-500/20 bg-blue-500/10">
                <Files className="h-10 w-10 text-blue-400" />
              </div>

              <div className="min-w-0 flex-1">
                <h1 className="wrap-break-word text-3xl font-bold leading-tight text-white sm:text-5xl">
                  {data.title}
                </h1>

                <div className="mt-6 flex flex-wrap gap-3">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
                    <FileText className="h-4 w-4 text-red-400" />
                    {data.count} {data.count === 1 ? "PDF" : "PDFs"}
                  </div>

                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
                    <Files className="h-4 w-4 text-blue-400" />
                    {formatFileSize(
                      data.notes.reduce((sum, n) => sum + n.fileSize, 0)
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* PDF LIST */}
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <div className="grid gap-4 sm:grid-cols-2">
            {data.notes.map((note) => (
              <div
                key={note._id}
                className="flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#111827] p-5 transition hover:border-blue-500/30"
              >
                {/* Top */}
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10">
                    <FileText className="h-7 w-7 text-red-400" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="line-clamp-2 break-words text-base font-semibold leading-6 text-white">
                      {note.title}
                    </h3>

                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                      <span>{formatFileSize(note.fileSize)}</span>

                      {note.pageCount ? (
                        <span>{note.pageCount} pages</span>
                      ) : null}

                      <span>{formatDate(note.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                {note.description && (
                  <p className="mt-4 line-clamp-2 text-sm leading-6 text-slate-400">
                    {note.description}
                  </p>
                )}

                {/* Labels */}
                {note.labels.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {note.labels.map((label) => (
                      <span
                        key={label._id}
                        className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium"
                        style={{
                          backgroundColor: `${label.color}15`,
                          borderColor: `${label.color}40`,
                          color: label.color,
                        }}
                      >
                        <Tag className="h-3 w-3" />
                        {label.name}
                      </span>
                    ))}
                  </div>
                )}

                {note.isSummarized && (
                  <div className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-1 text-xs font-medium text-purple-400">
                    <Sparkles className="h-3.5 w-3.5" />
                    AI summarized
                  </div>
                )}

                {/* Spacer */}
                <div className="flex-1" />

                {/* Actions */}
                <div className="mt-5 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setPreviewNote(note)}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500"
                  >
                    <Eye className="h-4 w-4" />
                    Preview
                  </button>

                  <button
                    type="button"
                    onClick={() => downloadNote(note)}
                    disabled={downloadingId === note._id}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/10 disabled:opacity-50"
                  >
                    {downloadingId === note._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    {downloadingId === note._id ? "Downloading..." : "Download"}
                  </button>
                </div>
                {downloadError?.id === note._id && (
                  <p className="mt-2 text-xs text-red-400">{downloadError.message}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mx-auto max-w-6xl px-4 pb-12 sm:px-6">
          <div className="rounded-3xl border border-white/10 bg-[#111827] p-6 text-center sm:p-10">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-500/10">
              <Sparkles className="h-7 w-7 text-blue-400" />
            </div>

            <h2 className="text-2xl font-bold text-white sm:text-3xl">
              Organize PDFs with AI
            </h2>

            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">
              Upload PDFs, generate AI summaries, organize notes with labels,
              and share documents instantly using NoteSphere.
            </p>

            <Link
              href="/auth/signup"
              className="mt-7 inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-sm font-medium text-white transition hover:bg-blue-500"
            >
              Start Free
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* PDF PREVIEW */}
      {previewNote && (
        <PDFPreviewModal
          note={{
            _id: previewNote._id,
            title: previewNote.title,
            s3Key: "",
          }}
          presignedUrl={previewNote.previewUrl}
          onClose={() => setPreviewNote(null)}
        />
      )}
    </>
  );
}
