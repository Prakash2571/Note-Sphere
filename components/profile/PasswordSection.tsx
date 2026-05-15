/**
 * components/profile/PasswordSection.tsx
 *
 * Change password form — only rendered for credentials users.
 * Posts to /api/profile/password which verifies the current password
 * before updating to the new one.
 */

"use client";

import { useState } from "react";
import {
  Lock, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle,
} from "lucide-react";

export function PasswordSection() {
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd,     setNewPwd]     = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew,     setShowNew]     = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [error,    setError]    = useState("");
  const [success,  setSuccess]  = useState(false);

  // Live password strength checks (mirrors signup page)
  const checks = [
    { label: "At least 8 characters", valid: newPwd.length >= 8 },
    { label: "Contains a number",     valid: /\d/.test(newPwd) },
    { label: "Contains a letter",     valid: /[a-zA-Z]/.test(newPwd) },
  ];
  const allValid = checks.every((c) => c.valid);

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (newPwd !== confirmPwd) {
      setError("New passwords do not match");
      return;
    }
    if (!allValid) {
      setError("New password does not meet the requirements");
      return;
    }

    setIsSaving(true);
    try {
      const res    = await fetch("/api/profile/password", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? "Failed to change password");

      // Clear form + show success state
      setSuccess(true);
      setCurrentPwd("");
      setNewPwd("");
      setConfirmPwd("");
      setTimeout(() => setSuccess(false), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="bg-[#111827] border border-[#1e2d45] rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <Lock className="w-4 h-4 text-slate-500" />
        <h3 className="text-sm font-semibold text-slate-300">Change Password</h3>
      </div>

      {/* Banner messages */}
      {error && (
        <div className="mb-4 flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 flex items-start gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
          Password updated successfully
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Current password */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">
            Current password
          </label>
          <div className="relative">
            <input
              type={showCurrent ? "text" : "password"}
              value={currentPwd}
              onChange={(e) => setCurrentPwd(e.target.value)}
              required
              placeholder="Enter your current password"
              className="w-full bg-[#0d1526] border border-[#1e2d45] focus:border-blue-500 rounded-xl px-4 pr-10 py-2.5 text-slate-100 placeholder-slate-600 outline-none transition-colors text-sm"
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* New password */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">
            New password
          </label>
          <div className="relative">
            <input
              type={showNew ? "text" : "password"}
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              required
              placeholder="Min. 8 characters"
              className="w-full bg-[#0d1526] border border-[#1e2d45] focus:border-blue-500 rounded-xl px-4 pr-10 py-2.5 text-slate-100 placeholder-slate-600 outline-none transition-colors text-sm"
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Live strength checks */}
          {newPwd.length > 0 && (
            <div className="mt-2 space-y-1">
              {checks.map((c) => (
                <div key={c.label} className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${c.valid ? "bg-green-400" : "bg-slate-600"}`} />
                  <span className={`text-xs ${c.valid ? "text-green-400" : "text-slate-500"}`}>
                    {c.label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Confirm password */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">
            Confirm new password
          </label>
          <input
            type={showNew ? "text" : "password"}
            value={confirmPwd}
            onChange={(e) => setConfirmPwd(e.target.value)}
            required
            placeholder="Re-enter new password"
            className="w-full bg-[#0d1526] border border-[#1e2d45] focus:border-blue-500 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-600 outline-none transition-colors text-sm"
          />
          {confirmPwd && newPwd !== confirmPwd && (
            <p className="mt-1.5 text-xs text-red-400">Passwords do not match</p>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSaving || !allValid || newPwd !== confirmPwd || !currentPwd}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
            : <><Lock     className="w-4 h-4" /> Update Password</>}
        </button>
      </form>
    </div>
  );
}
