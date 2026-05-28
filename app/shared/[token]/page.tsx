"use client";

import { use, useEffect, useState } from "react";

import Link from "next/link";

import {
  AlertCircle,
  BookOpen,
  ChevronRight,
  Eye,
  EyeOff,
  FileText,
  Loader2,
  Sparkles,
  Tag,
  CalendarDays,
  Files,
} from "lucide-react";

import { PDFPreviewModal } from "@/components/modals/PDFPreviewModal";

import {
  formatDate,
  formatFileSize,
} from "@/lib/utils";

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

interface ApiResponse {
  note: SharedNote;
  presignedUrl: string;
}

interface SharedNotePageProps {
  params: Promise<{
    token: string;
  }>;
}

export default function SharedNotePage({
  params,
}: SharedNotePageProps) {
  const { token } = use(params);

  const [note, setNote] =
    useState<SharedNote | null>(null);

  const [presignedUrl, setPresignedUrl] =
    useState("");

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [showPdf, setShowPdf] =
    useState(false);

  const [showSummary, setShowSummary] =
    useState(true);

  /* Load note */
  useEffect(() => {
    async function loadNote() {
      try {
        setIsLoading(true);

        const res = await fetch(
          `/api/shared/${token}`,
          {
            cache: "no-store",
          }
        );

        const data: ApiResponse & {
          error?: string;
        } = await res.json();

        if (!res.ok) {
          throw new Error(
            data.error ||
              "Failed to load shared note."
          );
        }

        setNote(data.note);

        setPresignedUrl(
          data.presignedUrl
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong."
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadNote();
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
            Loading shared note
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Fetching PDF and metadata...
          </p>
        </div>
      </div>
    );
  }

  /* Error */
  if (error || !note) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#020817] px-4">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#111827] p-6 text-center sm:p-8">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-red-500/10">
            <AlertCircle className="h-8 w-8 text-red-400" />
          </div>

          <h1 className="text-2xl font-bold text-white">
            This note is unavailable
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-400">
            {error ||
              "This shared note no longer exists or the share link was revoked."}
          </p>

          <Link
            href="/"
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-blue-500"
          >
            <BookOpen className="h-4 w-4" />
            Go to Note-Sphere
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
            {/* LOGO */}
            <Link
              href="/"
              className="flex items-center gap-3"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-linear-to-br from-red-500 to-blue-600 shadow-lg shadow-blue-500/20">
                <BookOpen className="h-5 w-5 text-white" />
              </div>

              <div>
                <p className="text-base font-semibold tracking-tight text-white">
                  Note-Sphere
                </p>

                <p className="text-xs text-slate-500">
                  AI PDF Workspace
                </p>
              </div>
            </Link>

            {/* CTA */}
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
              Public shared note
            </div>

            <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-start">
              {/* ICON */}
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl border border-red-500/20 bg-red-500/10">
                <FileText className="h-10 w-10 text-red-400" />
              </div>

              {/* CONTENT */}
              <div className="min-w-0 flex-1">
                <h1 className="wrap-break-word text-3xl font-bold leading-tight text-white sm:text-5xl">
                  {note.title}
                </h1>

                {note.description && (
                  <p className="mt-5 max-w-3xl text-sm leading-7 text-slate-400 sm:text-base">
                    {note.description}
                  </p>
                )}

                {/* META */}
                <div className="mt-6 flex flex-wrap gap-3">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
                    <Files className="h-4 w-4 text-blue-400" />

                    {formatFileSize(
                      note.fileSize
                    )}
                  </div>

                  {note.pageCount && (
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
                      <FileText className="h-4 w-4 text-purple-400" />

                      {note.pageCount} pages
                    </div>
                  )}

                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
                    <CalendarDays className="h-4 w-4 text-green-400" />

                    {formatDate(
                      note.createdAt
                    )}
                  </div>
                </div>

                {/* LABELS */}
                {note.labels.length > 0 && (
                  <div className="mt-6 flex flex-wrap gap-2">
                    {note.labels.map(
                      (label) => (
                        <span
                          key={label._id}
                          className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium"
                          style={{
                            backgroundColor: `${label.color}15`,
                            borderColor: `${label.color}40`,
                            color: label.color,
                          }}
                        >
                          <Tag className="h-3 w-3" />
                          {label.name}
                        </span>
                      )
                    )}
                  </div>
                )}

                {/* ACTIONS */}
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <button
                    onClick={() =>
                      setShowPdf(true)
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-blue-500"
                  >
                    <Eye className="h-4 w-4" />
                    Preview PDF
                  </button>

                  <a
                    href={presignedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/10"
                  >
                    Open Original PDF
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SUMMARY */}
        {note.isSummarized &&
          note.summary && (
            <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
              <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#111827]">
                {/* HEADER */}
                <button
                  onClick={() =>
                    setShowSummary(
                      !showSummary
                    )
                  }
                  className="flex w-full items-center justify-between px-5 py-5 transition hover:bg-white/5 sm:px-7"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/10">
                      <Sparkles className="h-6 w-6 text-purple-400" />
                    </div>

                    <div className="text-left">
                      <h2 className="text-base font-semibold text-white">
                        AI Summary
                      </h2>

                      <p className="mt-1 text-xs text-slate-500">
                        Generated with Gemini AI
                      </p>
                    </div>
                  </div>

                  {showSummary ? (
                    <EyeOff className="h-5 w-5 text-slate-500" />
                  ) : (
                    <Eye className="h-5 w-5 text-slate-500" />
                  )}
                </button>

                {/* BODY */}
                {showSummary && (
                  <div className="border-t border-white/10 px-5 py-6 sm:px-7">
                    <div className="whitespace-pre-wrap text-sm leading-7 text-slate-300 sm:text-[15px]">
                      {note.summary}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

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
              Upload PDFs, generate AI
              summaries, organize notes
              with labels, and share
              documents instantly using
              Note-Sphere.
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
      {showPdf && (
        <PDFPreviewModal
          note={{
            _id: "",
            title: note.title,
            s3Key: "",
          }}
          presignedUrl={presignedUrl}
          onClose={() =>
            setShowPdf(false)
          }
        />
      )}
    </>
  );
}