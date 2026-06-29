/**
 * components/modals/MultiShareModal.tsx
 *
 * Lets the user pick MANY PDFs and mint a single public share link.
 * Recipients open the link and can preview + download every selected PDF.
 *
 * Notes are read straight from the Redux store (single source of truth) so the
 * list stays in sync with the dashboard.
 */

"use client";

import { useEffect, useMemo, useState } from "react";

import {
  Check,
  CheckSquare,
  Copy,
  ExternalLink,
  FileText,
  Link as LinkIcon,
  Loader2,
  Search,
  Share2,
  Square,
  X,
} from "lucide-react";

import { useAppDispatch, useAppSelector } from "@/store/hooks";

import { fetchNotes } from "@/store/slices/notesSlice";

import { formatFileSize } from "@/lib/utils";

interface MultiShareModalProps {
  onClose: () => void;
}

export function MultiShareModal({ onClose }: MultiShareModalProps) {
  const dispatch = useAppDispatch();

  const notes = useAppSelector((state) => state.notes.items);

  /* Ensure notes are loaded even if the dashboard grid never mounted. */
  useEffect(() => {
    if (notes.length === 0) {
      dispatch(fetchNotes());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [title, setTitle] = useState("");
  const [search, setSearch] = useState("");

  const [shareUrl, setShareUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [error, setError] = useState("");

  /* Notes filtered by the in-modal search box */
  const visibleNotes = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter((n) => n.title.toLowerCase().includes(q));
  }, [notes, search]);

  const allVisibleSelected =
    visibleNotes.length > 0 &&
    visibleNotes.every((n) => selected.has(n._id));

  function toggleNote(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        visibleNotes.forEach((n) => next.delete(n._id));
      } else {
        visibleNotes.forEach((n) => next.add(n._id));
      }
      return next;
    });
  }

  async function handleCreateLink() {
    if (selected.size === 0) {
      setError("Select at least one PDF to share.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/shares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          noteIds: Array.from(selected),
          title: title.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create share link.");
      }

      // Build the URL from the current origin so it works in any environment.
      setShareUrl(`${window.location.origin}/shared/collection/${data.token}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create share link."
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(shareUrl);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  }

  function resetAndCreateAnother() {
    setShareUrl("");
    setSelected(new Set());
    setTitle("");
    setSearch("");
    setError("");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div onClick={onClose} className="absolute inset-0 bg-black/70" />

      {/* Modal */}
      <div className="relative flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#111827] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
              <Share2 className="h-5 w-5 text-blue-400" />
            </div>

            <div className="min-w-0">
              <h2 className="text-base font-semibold text-white">
                Share multiple PDFs
              </h2>
              <p className="truncate text-xs text-slate-500">
                Pick PDFs and generate one shareable link
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-white/5 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ── Success view ── */}
        {shareUrl ? (
          <div className="space-y-5 p-5 sm:p-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-green-500/10 px-3 py-1 text-xs font-medium text-green-400">
              <Check className="h-3.5 w-3.5" />
              Share link ready
            </div>

            <p className="text-sm leading-6 text-slate-400">
              Anyone with this link can preview and download the{" "}
              <span className="font-medium text-slate-200">
                {selected.size}
              </span>{" "}
              selected {selected.size === 1 ? "PDF" : "PDFs"} — no account
              needed.
            </p>

            <div>
              <label className="mb-2 block text-xs font-medium text-slate-400">
                Share link
              </label>

              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-white/10 bg-[#0f172a] px-3 py-3">
                  <LinkIcon className="h-4 w-4 shrink-0 text-slate-500" />
                  <span className="truncate text-sm text-slate-300">
                    {shareUrl}
                  </span>
                </div>

                <button
                  onClick={handleCopy}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-500/10 px-4 py-3 text-sm font-medium text-blue-400 transition hover:bg-blue-500/20"
                >
                  {isCopied ? (
                    <>
                      <Check className="h-4 w-4" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <a
                href={shareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/5 px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
              >
                <ExternalLink className="h-4 w-4" />
                Open Link
              </a>

              <button
                onClick={resetAndCreateAnother}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-500"
              >
                <Share2 className="h-4 w-4" />
                Create Another
              </button>
            </div>
          </div>
        ) : (
          /* ── Selection view ── */
          <>
            <div className="space-y-3 border-b border-white/10 px-5 py-4">
              {/* Title input */}
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Collection title (optional)"
                maxLength={200}
                className="w-full rounded-xl border border-white/10 bg-[#0f172a] px-3 py-2.5 text-sm text-slate-200 outline-none transition placeholder:text-slate-500 focus:border-blue-400"
              />

              {/* Search + select all */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search PDFs..."
                    className="w-full rounded-xl border border-white/10 bg-[#0f172a] py-2.5 pr-3 pl-10 text-sm text-slate-200 outline-none transition placeholder:text-slate-500 focus:border-blue-400"
                  />
                </div>

                <button
                  onClick={toggleSelectAll}
                  disabled={visibleNotes.length === 0}
                  className="shrink-0 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-medium text-slate-300 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
                >
                  {allVisibleSelected ? "Clear all" : "Select all"}
                </button>
              </div>
            </div>

            {/* Note list */}
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
              {visibleNotes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FileText className="mb-3 h-8 w-8 text-slate-600" />
                  <p className="text-sm text-slate-500">
                    {notes.length === 0
                      ? "Upload some PDFs first."
                      : "No PDFs match your search."}
                  </p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {visibleNotes.map((note) => {
                    const isChecked = selected.has(note._id);

                    return (
                      <li key={note._id}>
                        <button
                          onClick={() => toggleNote(note._id)}
                          className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition ${
                            isChecked
                              ? "border-blue-500/40 bg-blue-500/10"
                              : "border-white/10 bg-white/[0.02] hover:bg-white/5"
                          }`}
                        >
                          {isChecked ? (
                            <CheckSquare className="h-5 w-5 shrink-0 text-blue-400" />
                          ) : (
                            <Square className="h-5 w-5 shrink-0 text-slate-500" />
                          )}

                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-500/10">
                            <FileText className="h-4 w-4 text-red-400" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-white">
                              {note.title}
                            </p>
                            <p className="text-xs text-slate-500">
                              {formatFileSize(note.fileSize)}
                            </p>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-white/10 px-5 py-4">
              {error && (
                <div className="mb-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
                  {error}
                </div>
              )}

              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-slate-400">
                  {selected.size} selected
                </span>

                <button
                  onClick={handleCreateLink}
                  disabled={isLoading || selected.size === 0}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Share2 className="h-4 w-4" />
                      Create Share Link
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
