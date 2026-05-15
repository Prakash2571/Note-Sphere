/**
 * app/dashboard/profile/page.tsx
 *
 * Profile page — orchestrates 4 sub-components:
 *   - ProfileHeader  (avatar + name editing + email + stats)
 *   - AccountInfo    (provider, joined date)
 *   - PasswordSection (change password — only for credentials users)
 *   - DangerZone     (delete account)
 *
 * All data fetching happens here so it can be passed down once.
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { ProfileHeader }   from "@/components/profile/ProfileHeader";
import { AccountInfo }     from "@/components/profile/AccountInfo";
import { PasswordSection } from "@/components/profile/PasswordSection";
import { DangerZone }      from "@/components/profile/DangerZone";

export interface ProfileData {
  user: {
    id:        string;
    name:      string;
    email:     string;
    image?:    string | null;
    provider:  "credentials" | "google";
    createdAt: string;
  };
  stats: {
    totalNotes:   number;
    totalLabels:  number;
    sharedNotes:  number;
    storageBytes: number;
  };
}

export default function ProfilePage() {
  const [data,      setData]      = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error,     setError]     = useState("");

  // ── Fetch profile + stats ──────────────────────────────────────────────────
  const fetchProfile = useCallback(async () => {
    try {
      const res    = await fetch("/api/profile");
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? "Failed to load profile");
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load profile");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error || !data) {
    return (
      <div className="flex flex-col items-center gap-2 py-24 text-center">
        <AlertCircle className="w-10 h-10 text-red-400" />
        <p className="text-slate-400 text-sm">{error || "Failed to load profile"}</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Profile</h1>
        <p className="text-slate-400 text-sm mt-1">
          Manage your account, security, and personal information.
        </p>
      </div>

      {/* Avatar + name editing + stats grid */}
      <ProfileHeader data={data} onUpdate={fetchProfile} />

      {/* Provider + joined date */}
      <AccountInfo user={data.user} />

      {/* Password change — only for credentials users */}
      {data.user.provider === "credentials" && <PasswordSection />}

      {/* Delete account */}
      <DangerZone />
    </div>
  );
}
