"use client";

import { useState } from "react";

import { signOut } from "next-auth/react";

import {
  AlertTriangle,
  Loader2,
  Trash2,
  X,
} from "lucide-react";

const CONFIRM_PHRASE = "DELETE";

export function DangerZone() {
  const [isModalOpen, setIsModalOpen] =
    useState(false);

  const [confirmText, setConfirmText] =
    useState("");

  const [isDeleting, setIsDeleting] =
    useState(false);

  const [error, setError] = useState("");

  async function handleDelete() {
    if (confirmText !== CONFIRM_PHRASE) {
      return;
    }

    setIsDeleting(true);
    setError("");

    try {
      const res = await fetch(
        "/api/profile/delete",
        {
          method: "DELETE",
        }
      );

      if (!res.ok) {
        const data = await res.json();

        throw new Error(
          data.error ||
            "Failed to delete account."
        );
      }

      await signOut({
        callbackUrl: "/",
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete account."
      );

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
      {/* Card */}
      <div className="rounded-3xl border border-red-500/20 bg-[#111827] p-5 sm:p-6">
        <div className="mb-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400" />

          <h3 className="text-sm font-semibold text-red-400">
            Danger Zone
          </h3>
        </div>

        <p className="max-w-xl text-sm leading-6 text-slate-400">
          Deleting your account permanently
          removes all uploaded PDFs, notes,
          labels, summaries, and shared links.
          This action cannot be undone.
        </p>

        <button
          onClick={() =>
            setIsModalOpen(true)
          }
          className="mt-5 inline-flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-400 transition hover:bg-red-500/15"
        >
          <Trash2 className="w-4 h-4" />
          Delete Account
        </button>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-4">
          {/* Backdrop */}
          <div
            onClick={handleClose}
            className="absolute inset-0 bg-black/70"
          />

          {/* Panel */}
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-red-500/20 bg-[#111827] shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>

                <div>
                  <h2 className="text-base font-semibold text-white">
                    Delete Account
                  </h2>

                  <p className="text-xs text-slate-500">
                    This action is permanent
                  </p>
                </div>
              </div>

              <button
                onClick={handleClose}
                disabled={isDeleting}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-white/5 hover:text-white disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 sm:p-6">
              {/* Warning box */}
              <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
                <p className="mb-3 text-sm font-medium text-red-400">
                  The following data will be
                  deleted:
                </p>

                <ul className="space-y-2 pl-4 text-xs leading-5 text-red-300/80">
                  <li>
                    • All uploaded PDFs from S3
                  </li>

                  <li>
                    • Notes, summaries, and
                    metadata
                  </li>

                  <li>
                    • Labels and shared links
                  </li>

                  <li>
                    • Your account permanently
                  </li>
                </ul>
              </div>

              {/* Input */}
              <div className="mt-5">
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Type{" "}
                  <span className="rounded bg-red-500/10 px-1.5 py-0.5 font-mono text-red-400">
                    {CONFIRM_PHRASE}
                  </span>{" "}
                  to confirm
                </label>

                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) =>
                    setConfirmText(
                      e.target.value
                    )
                  }
                  disabled={isDeleting}
                  autoFocus
                  placeholder={CONFIRM_PHRASE}
                  className="w-full rounded-xl border border-white/10 bg-[#0f172a] px-4 py-3 font-mono text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-red-400/40"
                />
              </div>

              {/* Error */}
              {error && (
                <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                  {error}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex flex-col-reverse gap-3 border-t border-white/10 px-5 py-4 sm:flex-row">
              <button
                onClick={handleClose}
                disabled={isDeleting}
                className="flex-1 rounded-xl border border-white/10 bg-white/3 px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/5 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                onClick={handleDelete}
                disabled={
                  confirmText !==
                    CONFIRM_PHRASE ||
                  isDeleting
                }
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete Forever
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}