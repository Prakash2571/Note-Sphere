"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import {
  Check,
  Copy,
  ExternalLink,
  Globe,
  Loader2,
  Share2,
  Trash2,
} from "lucide-react";

import {
  formatDate,
  formatFileSize,
} from "@/lib/utils";

interface SharedNote {
  _id: string;
  title: string;
  description?: string;
  fileSize: number;
  createdAt: string;
  shareToken: string;
  isSummarized: boolean;
}

export default function SharedNotesPage() {
  const [notes, setNotes] =
    useState<SharedNote[]>([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [copiedId, setCopiedId] =
    useState<string | null>(null);

  const [revokingId, setRevokingId] =
    useState<string | null>(null);

  /* Fetch shared notes */
  useEffect(() => {
    async function fetchSharedNotes() {
      try {
        const res = await fetch(
          "/api/notes/shared",
          {
            cache: "no-store",
          }
        );

        const data =
          await res.json();

        if (res.ok) {
          setNotes(
            data.notes || []
          );
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchSharedNotes();
  }, []);

  /* Copy share link */
  async function copyLink(
    token: string,
    noteId: string
  ) {
    try {
      const url = `${window.location.origin}/shared/${token}`;

      await navigator.clipboard.writeText(
        url
      );

      setCopiedId(noteId);

      setTimeout(() => {
        setCopiedId(null);
      }, 2000);
    } catch (err) {
      console.error(err);
    }
  }

  /* Revoke share */
  async function revokeShare(
    noteId: string
  ) {
    const confirmed = confirm(
      "Revoke public sharing for this note?"
    );

    if (!confirmed) return;

    try {
      setRevokingId(noteId);

      const res = await fetch(
        `/api/notes/${noteId}/share`,
        {
          method: "DELETE",
        }
      );

      if (!res.ok) {
        throw new Error(
          "Failed to revoke share"
        );
      }

      setNotes((prev) =>
        prev.filter(
          (note) =>
            note._id !== noteId
        )
      );
    } catch (err) {
      console.error(err);
    } finally {
      setRevokingId(null);
    }
  }

  return (
    <section className="mx-auto max-w-7xl">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-500/10">
            <Share2 className="h-6 w-6 text-blue-400" />
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Shared Notes
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Manage all publicly
              shared PDFs and
              revoke links anytime.
            </p>
          </div>
        </div>
      </div>

      {/* Loading */}
      {isLoading ? (
        <div className="flex items-center justify-center py-28">
          <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
        </div>
      ) : notes.length === 0 ? (
        /* Empty State */
        <div className="rounded-3xl border border-white/10 bg-[#111827] px-6 py-16 text-center sm:px-10">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-white/5">
            <Globe className="h-8 w-8 text-slate-500" />
          </div>

          <h2 className="text-xl font-semibold text-white sm:text-2xl">
            No shared notes yet
          </h2>

          <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-slate-400">
            Notes you share publicly
            will appear here for easy
            management and link
            revocation.
          </p>
        </div>
      ) : (
        /* Notes Grid */
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {notes.map((note) => {
            const shareUrl = `/shared/${note.shareToken}`;

            return (
              <div
                key={note._id}
                className="group flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#111827] p-5 transition duration-300 hover:border-blue-500/30 hover:bg-[#141d2d]"
              >
                {/* Top */}
                <div className="mb-5 flex items-start justify-between gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-500/10">
                    <Globe className="h-5 w-5 text-blue-400" />
                  </div>

                  <span className="inline-flex items-center rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1 text-[11px] font-medium text-green-400">
                    Public
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1">
                  <h2 className="line-clamp-2 text-lg font-semibold leading-7 text-white">
                    {note.title}
                  </h2>

                  {note.description && (
                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-400">
                      {
                        note.description
                      }
                    </p>
                  )}

                  {/* Meta */}
                  <div className="mt-5 space-y-2 text-xs text-slate-500">
                    <p>
                      {formatFileSize(
                        note.fileSize
                      )}
                    </p>

                    <p>
                      Shared{" "}
                      {formatDate(
                        note.createdAt
                      )}
                    </p>

                    {note.isSummarized && (
                      <p className="font-medium text-purple-400">
                        AI summarized
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-6 flex flex-col gap-2">
                  {/* Open */}
                  <Link
                    href={shareUrl}
                    target="_blank"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-500"
                  >
                    <ExternalLink className="h-4 w-4" />

                    Open Shared Note
                  </Link>

                  {/* Copy */}
                  <button
                    onClick={() =>
                      copyLink(
                        note.shareToken,
                        note._id
                      )
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
                  >
                    {copiedId ===
                    note._id ? (
                      <>
                        <Check className="h-4 w-4 text-green-400" />

                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />

                        Copy Link
                      </>
                    )}
                  </button>

                  {/* Revoke */}
                  <button
                    onClick={() =>
                      revokeShare(
                        note._id
                      )
                    }
                    disabled={
                      revokingId ===
                      note._id
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-500/10 px-4 py-3 text-sm font-medium text-red-400 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {revokingId ===
                    note._id ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />

                        Revoking...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4" />

                        Revoke Share
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}