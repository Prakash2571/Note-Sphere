"use client";

import { useState } from "react";

import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
} from "lucide-react";

export function PasswordSection() {
  const [currentPwd, setCurrentPwd] =
    useState("");

  const [newPwd, setNewPwd] =
    useState("");

  const [confirmPwd, setConfirmPwd] =
    useState("");

  const [showCurrent, setShowCurrent] =
    useState(false);

  const [showNew, setShowNew] =
    useState(false);

  const [isSaving, setIsSaving] =
    useState(false);

  const [error, setError] = useState("");

  const [success, setSuccess] =
    useState(false);

  /* Password checks */
  const checks = [
    {
      label: "At least 8 characters",
      valid: newPwd.length >= 8,
    },
    {
      label: "Contains a number",
      valid: /\d/.test(newPwd),
    },
    {
      label: "Contains a letter",
      valid: /[a-zA-Z]/.test(newPwd),
    },
  ];

  const allValid = checks.every(
    (check) => check.valid
  );

  /* Submit */
  async function handleSubmit(
    e: React.FormEvent
  ) {
    e.preventDefault();

    setError("");
    setSuccess(false);

    if (newPwd !== confirmPwd) {
      setError(
        "New passwords do not match."
      );

      return;
    }

    if (!allValid) {
      setError(
        "Password does not meet requirements."
      );

      return;
    }

    setIsSaving(true);

    try {
      const res = await fetch(
        "/api/profile/password",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            currentPassword:
              currentPwd,
            newPassword: newPwd,
          }),
        }
      );

      const result = await res.json();

      if (!res.ok) {
        throw new Error(
          result.error ||
            "Failed to update password."
        );
      }

      setSuccess(true);

      setCurrentPwd("");
      setNewPwd("");
      setConfirmPwd("");

      setTimeout(() => {
        setSuccess(false);
      }, 4000);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update password."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-[#111827] p-5 sm:p-6">
      {/* Header */}
      <div className="mb-5 flex items-center gap-2">
        <Lock className="w-4 h-4 text-slate-500" />

        <h3 className="text-sm font-semibold text-slate-300">
          Change Password
        </h3>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <AlertCircle className="mt-0.5 w-4 h-4 shrink-0" />

          <span>{error}</span>
        </div>
      )}

      {/* Success */}
      {success && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-400">
          <CheckCircle2 className="mt-0.5 w-4 h-4 shrink-0" />

          <span>
            Password updated successfully
          </span>
        </div>
      )}

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="space-y-5"
      >
        {/* Current password */}
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-300">
            Current password
          </label>

          <div className="relative">
            <input
              type={
                showCurrent
                  ? "text"
                  : "password"
              }
              value={currentPwd}
              onChange={(e) =>
                setCurrentPwd(
                  e.target.value
                )
              }
              required
              placeholder="Enter current password"
              className="w-full rounded-xl border border-white/10 bg-[#0f172a] px-4 py-3 pr-11 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-blue-400/40"
            />

            <button
              type="button"
              onClick={() =>
                setShowCurrent(
                  !showCurrent
                )
              }
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-300"
            >
              {showCurrent ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* New password */}
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-300">
            New password
          </label>

          <div className="relative">
            <input
              type={
                showNew
                  ? "text"
                  : "password"
              }
              value={newPwd}
              onChange={(e) =>
                setNewPwd(
                  e.target.value
                )
              }
              required
              placeholder="Minimum 8 characters"
              className="w-full rounded-xl border border-white/10 bg-[#0f172a] px-4 py-3 pr-11 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-blue-400/40"
            />

            <button
              type="button"
              onClick={() =>
                setShowNew(!showNew)
              }
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-300"
            >
              {showNew ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Checks */}
          {newPwd.length > 0 && (
            <div className="mt-3 space-y-2">
              {checks.map((check) => (
                <div
                  key={check.label}
                  className="flex items-center gap-2"
                >
                  <div
                    className={`h-1.5 w-1.5 rounded-full ${
                      check.valid
                        ? "bg-green-400"
                        : "bg-slate-600"
                    }`}
                  />

                  <span
                    className={`text-xs ${
                      check.valid
                        ? "text-green-400"
                        : "text-slate-500"
                    }`}
                  >
                    {check.label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Confirm */}
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-300">
            Confirm new password
          </label>

          <input
            type={
              showNew
                ? "text"
                : "password"
            }
            value={confirmPwd}
            onChange={(e) =>
              setConfirmPwd(
                e.target.value
              )
            }
            required
            placeholder="Re-enter password"
            className="w-full rounded-xl border border-white/10 bg-[#0f172a] px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-blue-400/40"
          />

          {confirmPwd &&
            newPwd !== confirmPwd && (
              <p className="mt-2 text-xs text-red-400">
                Passwords do not match
              </p>
            )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={
            isSaving ||
            !allValid ||
            newPwd !== confirmPwd ||
            !currentPwd
          }
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Lock className="w-4 h-4" />
              Update Password
            </>
          )}
        </button>
      </form>
    </div>
  );
}