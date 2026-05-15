/**
 * components/profile/DangerZone.tsx
 *
 * Two-step account deletion:
 *   1. Click "Delete Account" → opens confirmation modal
 *   2. Type "DELETE" exactly to enable the final confirm button
 *
 * Calls DELETE /api/profile/delete which removes ALL user data:
 *   - PDFs in S3
 *   - Notes, Labels in MongoDB
 *   - The User document
 *
 * Then signs the user out and redirects to the landing page.
 */

"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { Trash2, AlertTriangle, Loader2, X } from "lucide-react";

const CONFIRM_PHRASE = "DELETE";

export function DangerZone() {
  const [isModalOpen,  setIsModalOpen]  = useState(false);
  const [confirmText,  setConfirmText]  = useState("");
  const [isDeleting,   setIsDeleting]   = useState(false);
  const [error,        setError]        = useState("");

  async function handleDelete() {
    if (confirmText !== CONFIRM_PHRASE) return;

    setIsDeleting(true);
    setError("");

    try {
      const res = await fetch("/api/profile/delete", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to delete account");
      }

      // Sign out and bounce to landing page — session is now invalid anyway
      await signOut({ callbackUrl: "/" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete account");
      setIsDeleting(false);
    }
  }

  function handleClose() {
    if (isDeleting) return;
    setIsModalOpen(false);
    setConfirmText("");
    setError("");
  }

  return (
    <>
      {/* ── Danger Zone card ──────────────────────────────────────────────── */}
      <div className="bg-[#111827] border border-red-500/20 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-4 h-4 text-red-400" />
          <h3 className="text-sm font-semibold text-red-400">Danger Zone</h3>
        </div>

        <p className="text-slate-400 text-sm mb-4 leading-relaxed">
          Once you delete your account, every PDF, note, and label is permanently removed.
          This action cannot be undone.
        </p>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 px-4 py-2 rounded-xl font-medium text-sm transition-all"
        >
          <Trash2 className="w-4 h-4" />
          Delete Account
        </button>
      </div>

      {/* ── Confirmation modal ─────────────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={handleClose}
          />

          <div className="relative bg-[#111827] border border-red-500/30 rounded-2xl w-full max-w-md shadow-2xl">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e2d45]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-red-500/15 border border-red-500/20 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                </div>
                <h2 className="text-base font-semibold text-white">Delete Account</h2>
              </div>
              <button
                onClick={handleClose}
                disabled={isDeleting}
                className="text-slate-500 hover:text-white p-1.5 rounded-lg hover:bg-[#1a2235] transition-all disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                <p className="text-red-400 text-sm font-medium mb-1">
                  This will permanently delete:
                </p>
                <ul className="text-red-300/80 text-xs space-y-1 ml-4 list-disc">
                  <li>All your uploaded PDFs from AWS S3</li>
                  <li>All your notes and metadata</li>
                  <li>All your labels and shared links</li>
                  <li>Your account itself</li>
                </ul>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Type <span className="font-mono text-red-400">{CONFIRM_PHRASE}</span> to confirm
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder={CONFIRM_PHRASE}
                  disabled={isDeleting}
                  autoFocus
                  className="w-full bg-[#0d1526] border border-[#1e2d45] focus:border-red-500 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-600 outline-none transition-colors text-sm font-mono"
                />
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {error}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-2 px-6 py-4 border-t border-[#1e2d45]">
              <button
                onClick={handleClose}
                disabled={isDeleting}
                className="flex-1 bg-[#1a2235] hover:bg-[#1e2a42] border border-[#2d3f5a] text-slate-300 py-2.5 rounded-xl font-medium text-sm transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={confirmText !== CONFIRM_PHRASE || isDeleting}
                className="flex-1 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white py-2.5 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-red-900/30 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isDeleting
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Deleting...</>
                  : <><Trash2  className="w-4 h-4" /> Delete Forever</>}
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
