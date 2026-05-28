/**
 * app/dashboard/profile/page.tsx
 */

"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  AlertCircle,
  Loader2,
} from "lucide-react";

import { AccountInfo } from "@/components/profile/AccountInfo";
import { DangerZone } from "@/components/profile/DangerZone";
import { PasswordSection } from "@/components/profile/PasswordSection";
import { ProfileHeader } from "@/components/profile/ProfileHeader";

export interface ProfileData {
  user: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
    provider:
      | "credentials"
      | "google";
    createdAt: string;
  };

  stats: {
    totalNotes: number;
    totalLabels: number;
    sharedNotes: number;
    storageBytes: number;
  };
}

export default function ProfilePage() {
  const [data, setData] =
    useState<ProfileData | null>(
      null
    );

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  /* Fetch profile */
  const fetchProfile =
    useCallback(async () => {
      try {
        const res = await fetch(
          "/api/profile"
        );

        const result =
          await res.json();

        if (!res.ok) {
          throw new Error(
            result.error ||
              "Failed to load profile."
          );
        }

        setData(result);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load profile."
        );
      } finally {
        setIsLoading(false);
      }
    }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  /* Loading */
  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10">
            <Loader2 className="h-7 w-7 animate-spin text-blue-400" />
          </div>

          <p className="text-sm text-slate-500">
            Loading profile...
          </p>
        </div>
      </div>
    );
  }

  /* Error */
  if (error || !data) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#111827] p-6 text-center sm:p-8">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10">
            <AlertCircle className="h-7 w-7 text-red-400" />
          </div>

          <h2 className="text-xl font-semibold text-white">
            Failed to load profile
          </h2>

          <p className="mt-3 text-sm leading-6 text-slate-400">
            {error}
          </p>
        </div>
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Profile
        </h1>

        <p className="mt-2 text-sm leading-6 text-slate-400">
          Manage your account,
          profile details, and
          security settings.
        </p>
      </div>

      {/* Profile */}
      <ProfileHeader
        data={data}
        onUpdate={fetchProfile}
      />

      {/* Account info */}
      <AccountInfo
        user={data.user}
      />

      {/* Password */}
      {data.user.provider ===
        "credentials" && (
        <PasswordSection />
      )}

      {/* Danger zone */}
      <DangerZone />
    </section>
  );
}