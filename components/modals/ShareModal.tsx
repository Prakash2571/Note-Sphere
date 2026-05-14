/**
 * components/modals/ShareModal.tsx
 * Modal for generating and managing the public share link for a note.
 */

"use client";

import { useState, useEffect } from "react";
import { X, Share2, Link, Copy, Check, Loader2, Trash2, ExternalLink } from "lucide-react";

interface Note {
  _id: string;
  title: string;
  isShared: boolean;
  shareToken?: string;
}

interface ShareModalProps {
  note: Note;
  onClose: () => void;
  onUpdate: (updated: Partial<Note> & { _id: string }) => void;
}

export function ShareModal({ note, onClose, onUpdate }: ShareModalProps) {
  const [isShared, setIsShared] = useState(note.isShared);
  const [shareUrl, setShareUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [error, setError] = useState("");

  // Build the share URL if already shared
  useEffect(() => {
    if (note.isShared && note.shareToken) {
      setShareUrl(`${window.location.origin}/shared/${note.shareToken}`);
    }
  }, [note]);

  // ── Generate share link ────────────────────────────────────────────────────
  async function handleEnableShare() {
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/notes/${note._id}/share`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setShareUrl(data.shareUrl);
      setIsShared(true);
      onUpdate({ _id: note._id, isShared: true, shareToken: data.shareToken });
    } catch {
      setError("Failed to generate share link. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  // ── Revoke share link ──────────────────────────────────────────────────────
  async function handleRevokeShare() {
    if (!confirm("Revoke this share link? Anyone with the link will lose access.")) return;

    setIsLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/notes/${note._id}/share`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      setShareUrl("");
      setIsShared(false);
      onUpdate({ _id: note._id, isShared: false, shareToken: undefined });
    } catch {
      setError("Failed to revoke share link. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  // ── Copy URL to clipboard ──────────────────────────────────────────────────
  async function handleCopy() {
    await navigator.clipboard.writeText(shareUrl);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-[#111827] border border-[#1e2d45] rounded-2xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e2d45]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-green-500/15 border border-green-500/20 flex items-center justify-center">
              <Share2 className="w-4 h-4 text-green-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Share Note</h2>
              <p className="text-xs text-slate-500 truncate max-w-xs">{note.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white p-1.5 rounded-lg hover:bg-[#1a2235] transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Error */}
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {isShared && shareUrl ? (
            /* ── Active share link ─── */
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-1 px-2 text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg text-xs">
                <Share2 className="w-3.5 h-3.5" />
                This note is publicly shared
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 mb-2 block">
                  Share link
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 flex items-center gap-2 bg-[#0d1526] border border-[#1e2d45] rounded-xl px-3 py-2.5 min-w-0">
                    <Link className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                    <span className="text-xs text-slate-400 truncate">{shareUrl}</span>
                  </div>
                  <button
                    onClick={handleCopy}
                    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-400 rounded-xl text-xs font-medium transition-all"
                  >
                    {isCopied ? (
                      <><Check className="w-3.5 h-3.5" /> Copied!</>
                    ) : (
                      <><Copy className="w-3.5 h-3.5" /> Copy</>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                <a
                  href={shareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#1a2235] hover:bg-[#1e2a42] border border-[#2d3f5a] text-slate-300 hover:text-white rounded-xl text-sm font-medium transition-all"
                >
                  <ExternalLink className="w-4 h-4" />
                  Preview Link
                </a>
                <button
                  onClick={handleRevokeShare}
                  disabled={isLoading}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <><Trash2 className="w-4 h-4" /> Revoke Link</>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* ── Not shared yet ─── */
            <div className="space-y-4">
              <div className="text-center py-6">
                <div className="w-14 h-14 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-4">
                  <Share2 className="w-7 h-7 text-green-400" />
                </div>
                <h3 className="text-base font-semibold text-white mb-2">
                  Share this note publicly
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed max-w-xs mx-auto">
                  Generate a shareable link that lets anyone preview this PDF — no account required.
                </p>
              </div>

              <button
                onClick={handleEnableShare}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
                ) : (
                  <><Share2 className="w-4 h-4" /> Generate Share Link</>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
