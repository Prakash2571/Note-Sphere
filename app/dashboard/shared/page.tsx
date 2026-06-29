"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import {
  Check,
  Copy,
  ExternalLink,
  Files,
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

interface ShareCollection {
  _id: string;
  title: string;
  token: string;
  count: number;
  noteTitles: string[];
  createdAt: string;
}

export default function SharedNotesPage() {
  const [notes, setNotes] =
    useState<SharedNote[]>([]);

  const [collections, setCollections] =
    useState<ShareCollection[]>([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [copiedId, setCopiedId] =
    useState<string | null>(null);

  const [revokingId, setRevokingId] =
    useState<string | null>(null);

  /* Fetch shared notes + bundles */
  useEffect(() => {
    async function fetchAll() {
      try {
        const [notesRes, bundlesRes] =
          await Promise.all([
            fetch("/api/notes/shared", {
              cache: "no-store",
            }),
            fetch("/api/shares", {
              cache: "no-store",
            }),
          ]);

        const notesData =
          await notesRes.json();

        const bundlesData =
          await bundlesRes.json();

        if (notesRes.ok) {
          setNotes(
            notesData.notes || []
          );
        }

        if (bundlesRes.ok) {
          setCollections(
            bundlesData.collections ||
              []
          );
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchAll();
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

  /* Copy bundle (collection) share link */
  async function copyBundleLink(
    token: string,
    bundleId: string
  ) {
    try {
      const url = `${window.location.origin}/shared/collection/${token}`;

      await navigator.clipboard.writeText(
        url
      );

      setCopiedId(bundleId);

      setTimeout(() => {
        setCopiedId(null);
      }, 2000);
    } catch (err) {
      console.error(err);
    }
  }

  /* Revoke a share bundle */
  async function revokeBundle(
    token: string,
    bundleId: string
  ) {
    const confirmed = confirm(
      "Revoke this shared collection? The link will stop working."
    );

    if (!confirmed) return;

    try {
      setRevokingId(bundleId);

      const res = await fetch(
        `/api/shares/${token}`,
        {
          method: "DELETE",
        }
      );

      if (!res.ok) {
        throw new Error(
          "Failed to revoke bundle"
        );
      }

      setCollections((prev) =>
        prev.filter(
          (c) => c._id !== bundleId
        )
      );
    } catch (err) {
      console.error(err);
    } finally {
      setRevokingId(null);
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

      {/* ── Shared Collections (multi-PDF bundles) ── */}
      {!isLoading && collections.length > 0 && (
        <div className="mb-12">
          <div className="mb-5 flex items-center gap-2">
            <Files className="h-5 w-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-white">
              Shared Collections
            </h2>
            <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-xs text-slate-400">
              {collections.length}
            </span>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {collections.map((bundle) => {
              const bundleUrl = `/shared/collection/${bundle.token}`;

              return (
                <div
                  key={bundle._id}
                  className="group flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#111827] p-5 transition duration-300 hover:border-blue-500/30 hover:bg-[#141d2d]"
                >
                  {/* Top */}
                  <div className="mb-5 flex items-start justify-between gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-500/10">
                      <Files className="h-5 w-5 text-blue-400" />
                    </div>

                    <span className="inline-flex items-center rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-[11px] font-medium text-blue-400">
                      {bundle.count}{" "}
                      {bundle.count === 1 ? "PDF" : "PDFs"}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <h3 className="line-clamp-2 text-lg font-semibold leading-7 text-white">
                      {bundle.title}
                    </h3>

                    {bundle.noteTitles.length > 0 && (
                      <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-400">
                        {bundle.noteTitles.join(", ")}
                      </p>
                    )}

                    <div className="mt-5 text-xs text-slate-500">
                      <p>
                        Shared {formatDate(bundle.createdAt)}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-6 flex flex-col gap-2">
                    <Link
                      href={bundleUrl}
                      target="_blank"
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-500"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Open Collection
                    </Link>

                    <button
                      onClick={() =>
                        copyBundleLink(
                          bundle.token,
                          bundle._id
                        )
                      }
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
                    >
                      {copiedId === bundle._id ? (
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

                    <button
                      onClick={() =>
                        revokeBundle(
                          bundle.token,
                          bundle._id
                        )
                      }
                      disabled={revokingId === bundle._id}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-500/10 px-4 py-3 text-sm font-medium text-red-400 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {revokingId === bundle._id ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Revoking...
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4" />
                          Revoke
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Single shared notes section heading */}
      {!isLoading && notes.length > 0 && (
        <div className="mb-5 flex items-center gap-2">
          <Globe className="h-5 w-5 text-blue-400" />
          <h2 className="text-lg font-semibold text-white">
            Individually Shared Notes
          </h2>
          <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-xs text-slate-400">
            {notes.length}
          </span>
        </div>
      )}

      {/* Loading */}
      {isLoading ? (
        <div className="flex items-center justify-center py-28">
          <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
        </div>
      ) : notes.length === 0 && collections.length === 0 ? (
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
      ) : notes.length === 0 ? null : (
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