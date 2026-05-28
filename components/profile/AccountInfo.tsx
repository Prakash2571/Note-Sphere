"use client";

import {
  Calendar,
  Globe,
  Mail,
  Shield,
} from "lucide-react";

import { formatDate } from "@/lib/utils";

interface AccountInfoProps {
  user: {
    email: string;
    provider: "credentials" | "google";
    createdAt: string;
  };
}

export function AccountInfo({
  user,
}: AccountInfoProps) {
  const isGoogle =
    user.provider === "google";

  const ProviderIcon = isGoogle
    ? Globe
    : Mail;

  return (
    <div className="rounded-3xl border border-white/10 bg-[#111827] p-5 sm:p-6">
      {/* Header */}
      <div className="mb-5 flex items-center gap-2">
        <Shield className="w-4 h-4 text-slate-500" />

        <h3 className="text-sm font-semibold text-slate-300">
          Account Information
        </h3>
      </div>

      <div className="space-y-5">
        {/* Provider */}
        <div className="flex items-start gap-4">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
              isGoogle
                ? "bg-blue-500/10"
                : "bg-red-500/10"
            }`}
          >
            <ProviderIcon
              className={`w-4 h-4 ${
                isGoogle
                  ? "text-blue-400"
                  : "text-red-400"
              }`}
            />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-xs text-slate-500">
              Sign-in method
            </p>

            <p className="mt-1 text-sm font-medium text-white">
              {isGoogle
                ? "Google account"
                : "Email & password"}
            </p>
          </div>
        </div>

        {/* Created at */}
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/4">
            <Calendar className="w-4 h-4 text-slate-400" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-xs text-slate-500">
              Member since
            </p>

            <p className="mt-1 text-sm font-medium text-white">
              {formatDate(user.createdAt)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}