"use client";

import { useEffect, useState } from "react";

import {
  Check,
  Copy,
  ExternalLink,
  Link as LinkIcon,
  Loader2,
  Share2,
  Trash2,
  X,
} from "lucide-react";

interface Note {
  _id: string;
  title: string;
  isShared: boolean;
  shareToken?: string;
}

interface ShareModalProps {
  note: Note;
  onClose: () => void;
  onUpdate: (
    updated: Partial<Note> & {
      _id: string;
    }
  ) => void;
}

export function ShareModal({
  note,
  onClose,
  onUpdate,
}: ShareModalProps) {
  const [isShared, setIsShared] = useState(
    note.isShared
  );

  const [shareUrl, setShareUrl] =
    useState("");

  const [isLoading, setIsLoading] =
    useState(false);

  const [isCopied, setIsCopied] =
    useState(false);

  const [error, setError] = useState("");

  /* Existing share URL */
  useEffect(() => {
    if (note.isShared && note.shareToken) {
      setShareUrl(
        `${window.location.origin}/shared/${note.shareToken}`
      );
    }
  }, [note]);

  /* Generate share link */
  async function handleEnableShare() {
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch(
        `/api/notes/${note._id}/share`,
        {
          method: "POST",
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error);
      }

      setShareUrl(data.shareUrl);

      setIsShared(true);

      onUpdate({
        _id: note._id,
        isShared: true,
        shareToken: data.shareToken,
      });
    } catch {
      setError(
        "Failed to generate share link."
      );
    } finally {
      setIsLoading(false);
    }
  }

  /* Revoke share */
  async function handleRevokeShare() {
    const confirmed = confirm(
      "Disable public sharing for this note?"
    );

    if (!confirmed) return;

    setIsLoading(true);
    setError("");

    try {
      const res = await fetch(
        `/api/notes/${note._id}/share`,
        {
          method: "DELETE",
        }
      );

      if (!res.ok) {
        const data = await res.json();

        throw new Error(data.error);
      }

      setShareUrl("");

      setIsShared(false);

      onUpdate({
        _id: note._id,
        isShared: false,
        shareToken: undefined,
      });
    } catch {
      setError(
        "Failed to revoke share link."
      );
    } finally {
      setIsLoading(false);
    }
  }

  /* Copy */
  async function handleCopy() {
    await navigator.clipboard.writeText(
      shareUrl
    );

    setIsCopied(true);

    setTimeout(() => {
      setIsCopied(false);
    }, 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/70"
      />

      {/* Modal */}
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#111827] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/10">
              <Share2 className="w-5 h-5 text-green-400" />
            </div>

            <div className="min-w-0">
              <h2 className="text-base font-semibold text-white">
                Share Note
              </h2>

              <p className="truncate text-xs text-slate-500">
                {note.title}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-white/5 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6">
          {/* Error */}
          {error && (
            <div className="mb-5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {isShared && shareUrl ? (
            <div className="space-y-5">
              {/* Active badge */}
              <div className="inline-flex items-center gap-2 rounded-full bg-green-500/10 px-3 py-1 text-xs font-medium text-green-400">
                <Share2 className="w-3.5 h-3.5" />
                Public sharing enabled
              </div>

              {/* URL */}
              <div>
                <label className="mb-2 block text-xs font-medium text-slate-400">
                  Share link
                </label>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-white/10 bg-[#0f172a] px-3 py-3">
                    <LinkIcon className="w-4 h-4 shrink-0 text-slate-500" />

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
                        <Check className="w-4 h-4" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <a
                  href={shareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/4 px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/[0.07] hover:text-white"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open Link
                </a>

                <button
                  onClick={handleRevokeShare}
                  disabled={isLoading}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-500/10 px-4 py-3 text-sm font-medium text-red-400 transition hover:bg-red-500/20 disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Revoke
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-500/10">
                <Share2 className="w-8 h-8 text-green-400" />
              </div>

              <h3 className="text-lg font-semibold text-white">
                Share this note
              </h3>

              <p className="mt-3 text-sm leading-6 text-slate-400">
                Generate a public link so anyone can
                preview this PDF without an account.
              </p>

              <button
                onClick={handleEnableShare}
                disabled={isLoading}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-blue-500 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4" />
                    Generate Share Link
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}