"use client";

import {
  useRef,
  useState,
} from "react";

import { useSession } from "next-auth/react";

import {
  Camera,
  Check,
  FileText,
  HardDrive,
  Loader2,
  Pencil,
  Share2,
  Tag,
  X,
} from "lucide-react";

import { formatFileSize } from "@/lib/utils";

import type { ProfileData } from "@/app/dashboard/profile/page";

interface ProfileHeaderProps {
  data: ProfileData;
  onUpdate: () => void;
}

export function ProfileHeader({
  data,
  onUpdate,
}: ProfileHeaderProps) {
  const { update: updateSession } =
    useSession();

  const fileInputRef =
    useRef<HTMLInputElement>(null);

  const [isUploading, setIsUploading] =
    useState(false);

  const [isEditing, setIsEditing] =
    useState(false);

  const [editName, setEditName] =
    useState(data.user.name);

  const [isSaving, setIsSaving] =
    useState(false);

  const [error, setError] = useState("");

  /* Avatar upload */
  async function handleAvatarChange(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];

    if (!file) return;

    setError("");
    setIsUploading(true);

    try {
      const formData = new FormData();

      formData.append("avatar", file);

      const res = await fetch(
        "/api/profile/avatar",
        {
          method: "POST",
          body: formData,
        }
      );

      const result = await res.json();

      if (!res.ok) {
        throw new Error(
          result.error ||
            "Failed to upload avatar."
        );
      }

      await updateSession({
        image: result.image,
      });

      onUpdate();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to upload avatar."
      );
    } finally {
      setIsUploading(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  /* Save name */
  async function handleSaveName() {
    if (!editName.trim()) {
      setError("Name cannot be empty.");

      return;
    }

    if (
      editName.trim() ===
      data.user.name
    ) {
      setIsEditing(false);

      return;
    }

    setIsSaving(true);
    setError("");

    try {
      const res = await fetch(
        "/api/profile",
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            name: editName.trim(),
          }),
        }
      );

      const result = await res.json();

      if (!res.ok) {
        throw new Error(
          result.error ||
            "Failed to update name."
        );
      }

      await updateSession({
        name: result.user.name,
      });

      onUpdate();

      setIsEditing(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update name."
      );
    } finally {
      setIsSaving(false);
    }
  }

  function handleCancelEdit() {
    setEditName(data.user.name);

    setError("");

    setIsEditing(false);
  }

  const initials =
    data.user.name
      .charAt(0)
      .toUpperCase();

  /* Stats */
  const stats = [
    {
      icon: FileText,
      label: "Notes",
      value: data.stats.totalNotes,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
    },
    {
      icon: Tag,
      label: "Labels",
      value: data.stats.totalLabels,
      color: "text-red-400",
      bg: "bg-red-500/10",
    },
    {
      icon: Share2,
      label: "Shared",
      value: data.stats.sharedNotes,
      color: "text-green-400",
      bg: "bg-green-500/10",
    },
    {
      icon: HardDrive,
      label: "Storage",
      value: formatFileSize(
        data.stats.storageBytes
      ),
      color: "text-purple-400",
      bg: "bg-purple-500/10",
    },
  ];

  return (
    <div className="rounded-3xl border border-white/10 bg-[#111827] p-5 sm:p-6">
      {/* Top */}
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        {/* Avatar */}
        <div className="relative shrink-0 group">
          {data.user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.user.image}
              alt={data.user.name}
              className="h-24 w-24 rounded-full object-cover border border-white/10"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-linear-to-br from-red-500 to-blue-600 text-3xl font-bold text-white">
              {initials}
            </div>
          )}

          {/* Overlay */}
          <button
            onClick={() =>
              fileInputRef.current?.click()
            }
            disabled={isUploading}
            className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60 opacity-0 transition group-hover:opacity-100"
          >
            {isUploading ? (
              <Loader2 className="w-6 h-6 animate-spin text-white" />
            ) : (
              <Camera className="w-6 h-6 text-white" />
            )}
          </button>

          {/* Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleAvatarChange}
            className="hidden"
          />
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1 text-center sm:text-left">
          {isEditing ? (
            <div>
              <input
                type="text"
                value={editName}
                maxLength={100}
                autoFocus
                onChange={(e) =>
                  setEditName(
                    e.target.value
                  )
                }
                className="w-full rounded-xl border border-white/10 bg-[#0f172a] px-4 py-3 text-lg text-white outline-none transition focus:border-blue-400/40"
              />

              <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
                <button
                  onClick={handleSaveName}
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 rounded-xl bg-green-500/10 px-4 py-2 text-sm font-medium text-green-400 transition hover:bg-green-500/20 disabled:opacity-50"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}

                  Save
                </button>

                <button
                  onClick={
                    handleCancelEdit
                  }
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/3 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/5"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <h2 className="max-w-full truncate text-2xl font-bold text-white">
                  {data.user.name}
                </h2>

                <button
                  onClick={() =>
                    setIsEditing(true)
                  }
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white/5 hover:text-blue-400"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </div>

              <p className="mt-1 truncate text-sm text-slate-400">
                {data.user.email}
              </p>
            </div>
          )}

          {error && (
            <p className="mt-3 text-sm text-red-400">
              {error}
            </p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="mt-7 grid grid-cols-2 gap-3 border-t border-white/10 pt-6 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.label}
              className="rounded-2xl border border-white/10 bg-[#0f172a] p-4"
            >
              <div
                className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${stat.bg}`}
              >
                <Icon
                  className={`w-5 h-5 ${stat.color}`}
                />
              </div>

              <p className="truncate text-xl font-bold text-white">
                {stat.value}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                {stat.label}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}