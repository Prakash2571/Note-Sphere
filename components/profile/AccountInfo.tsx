/**
 * components/profile/AccountInfo.tsx
 *
 * Read-only card showing how the user signed up and when.
 */

"use client";

import { Mail, Chrome, Calendar, Shield } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface AccountInfoProps {
  user: {
    email:     string;
    provider:  "credentials" | "google";
    createdAt: string;
  };
}

export function AccountInfo({ user }: AccountInfoProps) {
  // Choose icon + label based on the auth provider
  const isGoogle      = user.provider === "google";
  const ProviderIcon  = isGoogle ? Chrome : Mail;
  const providerLabel = isGoogle ? "Google account" : "Email & password";
  const providerColor = isGoogle ? "text-blue-400" : "text-red-400";
  const providerBg    = isGoogle ? "bg-blue-500/10" : "bg-red-500/10";

  return (
    <div className="bg-[#111827] border border-[#1e2d45] rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="w-4 h-4 text-slate-500" />
        <h3 className="text-sm font-semibold text-slate-300">Account Information</h3>
      </div>

      <div className="space-y-4">

        {/* Sign-in method */}
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl ${providerBg} flex items-center justify-center flex-shrink-0`}>
            <ProviderIcon className={`w-4 h-4 ${providerColor}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-500">Sign-in method</p>
            <p className="text-sm font-medium text-white truncate">{providerLabel}</p>
          </div>
        </div>

        {/* Joined date */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-500/10 flex items-center justify-center flex-shrink-0">
            <Calendar className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-500">Member since</p>
            <p className="text-sm font-medium text-white">{formatDate(user.createdAt)}</p>
          </div>
        </div>

      </div>
    </div>
  );
}
