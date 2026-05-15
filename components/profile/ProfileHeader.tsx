/**
 * components/profile/ProfileHeader.tsx
 *
 * The top section of the profile page.
 *
 * Responsibilities:
 *  - Display + edit the user's avatar (uploads to S3 via /api/profile/avatar)
 *  - Display + edit the user's name (PATCH /api/profile)
 *  - Show usage stats: total notes, labels, shared notes, storage used
 */

"use client";

import { useState, useRef } from "react";
import { useSession } from "next-auth/react";
import {
  Camera, Loader2, Pencil, Check, X, FileText,
  Tag, Share2, HardDrive,
} from "lucide-react";
import { formatFileSize } from "@/lib/utils";
import type { ProfileData } from "@/app/dashboard/profile/page";

interface ProfileHeaderProps {
  data:     ProfileData;
  onUpdate: () => void;
}

export function ProfileHeader({ data, onUpdate }: ProfileHeaderProps) {
  const { update: updateSession } = useSession();
  const fileInputRef              = useRef<HTMLInputElement>(null);

  const [isUploading,     setIsUploading]     = useState(false);
  const [isEditing,       setIsEditing]       = useState(false);
  const [editName,        setEditName]        = useState(data.user.name);
  const [isSaving,        setIsSaving]        = useState(false);
  const [error,           setError]           = useState("");

  // ── Avatar upload ──────────────────────────────────────────────────────────
  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const res    = await fetch("/api/profile/avatar", {
        method: "POST",
        body:   formData,
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? "Failed to upload avatar");

      // Refresh both local data and the NextAuth session (so header updates too)
      await updateSession({ image: result.image });
      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload avatar");
    } finally {
      setIsUploading(false);
      // Reset input so the same file can be re-selected if needed
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  // ── Save edited name ───────────────────────────────────────────────────────
  async function handleSaveName() {
    if (!editName.trim()) {
      setError("Name cannot be empty");
      return;
    }
    if (editName.trim() === data.user.name) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      const res    = await fetch("/api/profile", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ name: editName.trim() }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? "Failed to update name");

      await updateSession({ name: result.user.name });
      onUpdate();
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update name");
    } finally {
      setIsSaving(false);
    }
  }

  function handleCancelEdit() {
    setEditName(data.user.name);
    setError("");
    setIsEditing(false);
  }

  const initials = data.user.name.charAt(0).toUpperCase();

  // ── Stats grid config ──────────────────────────────────────────────────────
  const stats = [
    { icon: FileText,  label: "Notes",         value: data.stats.totalNotes,   color: "text-blue-400",    bg: "bg-blue-500/10",   border: "border-blue-500/20" },
    { icon: Tag,       label: "Labels",        value: data.stats.totalLabels,  color: "text-red-400",     bg: "bg-red-500/10",    border: "border-red-500/20" },
    { icon: Share2,    label: "Shared",        value: data.stats.sharedNotes,  color: "text-green-400",   bg: "bg-green-500/10",  border: "border-green-500/20" },
    { icon: HardDrive, label: "Storage Used",  value: formatFileSize(data.stats.storageBytes), color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20" },
  ];

  return (
    <div className="bg-[#111827] border border-[#1e2d45] rounded-2xl p-6">

      {/* ── Avatar + Name + Email ───────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">

        {/* Avatar with upload overlay */}
        <div className="relative group flex-shrink-0">
          {data.user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.user.image}
              alt={data.user.name}
              className="w-24 h-24 rounded-full object-cover border-2 border-[#1e2d45]"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-red-500 to-blue-600 flex items-center justify-center text-white text-3xl font-bold border-2 border-[#1e2d45]">
              {initials}
            </div>
          )}

          {/* Camera overlay */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer disabled:cursor-not-allowed"
            title="Change photo"
          >
            {isUploading
              ? <Loader2 className="w-6 h-6 text-white animate-spin" />
              : <Camera  className="w-6 h-6 text-white" />}
          </button>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleAvatarChange}
            className="hidden"
          />
        </div>

        {/* Name + email + edit controls */}
        <div className="flex-1 min-w-0 text-center sm:text-left">
          {isEditing ? (
            <div className="space-y-2">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                maxLength={100}
                autoFocus
                className="w-full bg-[#0d1526] border border-blue-500 rounded-xl px-3 py-2 text-white outline-none text-lg"
              />
              <div className="flex gap-2 justify-center sm:justify-start">
                <button
                  onClick={handleSaveName}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-400 text-sm font-medium transition-all disabled:opacity-50"
                >
                  {isSaving
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Check  className="w-3.5 h-3.5" />}
                  Save
                </button>
                <button
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a2235] hover:bg-[#1e2a42] text-slate-300 text-sm font-medium transition-all"
                >
                  <X className="w-3.5 h-3.5" />
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <h2 className="text-2xl font-bold text-white truncate">{data.user.name}</h2>
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-all"
                  title="Edit name"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-slate-400 text-sm mt-0.5 truncate">{data.user.email}</p>
            </div>
          )}

          {error && (
            <p className="mt-2 text-xs text-red-400">{error}</p>
          )}
        </div>
      </div>

      {/* ── Stats grid ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6 pt-6 border-t border-[#1e2d45]">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className={`${stat.bg} ${stat.border} border rounded-xl p-4`}
            >
              <Icon className={`w-5 h-5 ${stat.color} mb-2`} />
              <p className="text-xl font-bold text-white truncate">{stat.value}</p>
              <p className="text-xs text-slate-500">{stat.label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
