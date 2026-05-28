"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  AlertCircle,
  CheckCircle,
  FileText,
  Loader2,
  Tag,
  Upload,
  X,
} from "lucide-react";

import { useAppDispatch } from "@/store/hooks";

import { fetchNotes } from "@/store/slices/notesSlice";

import { formatFileSize } from "@/lib/utils";

interface Label {
  _id: string;
  name: string;
  color: string;
}

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function UploadModal({
  isOpen,
  onClose,
  onSuccess,
}: UploadModalProps) {
  const dispatch =
    useAppDispatch();

  const [file, setFile] =
    useState<File | null>(null);

  const [title, setTitle] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [selectedLabels, setSelectedLabels] =
    useState<string[]>([]);

  const [availableLabels, setAvailableLabels] =
    useState<Label[]>([]);

  const [isDragging, setIsDragging] =
    useState(false);

  const [isUploading, setIsUploading] =
    useState(false);

  const [error, setError] =
    useState("");

  const fileInputRef =
    useRef<HTMLInputElement>(null);

  /* Load labels */
  useEffect(() => {
    if (!isOpen) return;

    fetch("/api/labels")
      .then((res) => res.json())
      .then((data) =>
        setAvailableLabels(
          data.labels || []
        )
      );
  }, [isOpen]);

  /* Reset modal */
  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  function resetForm() {
    setFile(null);
    setTitle("");
    setDescription("");
    setSelectedLabels([]);
    setError("");
  }

  if (!isOpen) return null;

  /* File selection */
  function handleFileSelect(
    selectedFile: File
  ) {
    if (
      selectedFile.type !==
      "application/pdf"
    ) {
      setError(
        "Only PDF files are allowed."
      );

      return;
    }

    if (
      selectedFile.size >
      50 * 1024 * 1024
    ) {
      setError(
        "File size must be under 50MB."
      );

      return;
    }

    setError("");
    setFile(selectedFile);

    if (!title) {
      setTitle(
        selectedFile.name
          .replace(/\.pdf$/i, "")
          .replace(/[-_]/g, " ")
      );
    }
  }

  function handleDrop(
    e: React.DragEvent
  ) {
    e.preventDefault();

    setIsDragging(false);

    const droppedFile =
      e.dataTransfer.files[0];

    if (droppedFile) {
      handleFileSelect(
        droppedFile
      );
    }
  }

  /* Labels */
  function toggleLabel(
    labelId: string
  ) {
    setSelectedLabels((prev) =>
      prev.includes(labelId)
        ? prev.filter(
            (id) => id !== labelId
          )
        : [...prev, labelId]
    );
  }

  /* Upload */
  async function handleSubmit(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (!file) {
      setError(
        "Please select a PDF file."
      );

      return;
    }

    if (!title.trim()) {
      setError(
        "Please enter a title."
      );

      return;
    }

    try {
      setIsUploading(true);
      setError("");

      const formData =
        new FormData();

      formData.append(
        "file",
        file
      );

      formData.append(
        "title",
        title.trim()
      );

      formData.append(
        "description",
        description.trim()
      );

      formData.append(
        "labels",
        JSON.stringify(
          selectedLabels
        )
      );

      const response =
        await fetch(
          "/api/notes",
          {
            method: "POST",
            body: formData,
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        setError(
          data.error ||
            "Upload failed."
        );

        return;
      }

      /* IMPORTANT FIX */
      await dispatch(
        fetchNotes()
      );

      /* Parent callback */
      onSuccess?.();

      /* Reset */
      resetForm();

      /* Close modal */
      onClose();
    } catch (error) {
      console.error(error);

      setError(
        "Upload failed. Please try again."
      );
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-4">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-[#111827] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Upload PDF
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Maximum file size:
              50MB
            </p>
          </div>

          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-white/5 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="max-h-[85vh] overflow-y-auto p-5 sm:p-6"
        >
          {/* Error */}
          {error && (
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />

              <span>{error}</span>
            </div>
          )}

          {/* Upload area */}
          <div
            onDragOver={(e) => {
              e.preventDefault();

              setIsDragging(
                true
              );
            }}
            onDragLeave={() =>
              setIsDragging(
                false
              )
            }
            onDrop={handleDrop}
            onClick={() =>
              fileInputRef.current?.click()
            }
            className={`cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition ${
              isDragging
                ? "border-blue-400 bg-blue-500/10"
                : file
                ? "border-green-500/40 bg-green-500/5"
                : "border-white/10 hover:border-white/20 hover:bg-white/[0.03]"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={(e) => {
                const selected =
                  e.target
                    .files?.[0];

                if (selected) {
                  handleFileSelect(
                    selected
                  );
                }
              }}
            />

            {file ? (
              <div className="flex flex-col items-center">
                <CheckCircle className="mb-3 h-8 w-8 text-green-400" />

                <p className="max-w-full truncate text-sm font-medium text-green-400">
                  {file.name}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {formatFileSize(
                    file.size
                  )}
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10">
                  <Upload className="h-7 w-7 text-blue-400" />
                </div>

                <p className="text-sm font-medium text-slate-300">
                  Drop PDF here or
                  click to browse
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  PDF files up to
                  50MB
                </p>
              </div>
            )}
          </div>

          {/* Fields */}
          <div className="mt-6 space-y-5">
            {/* Title */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Title
              </label>

              <div className="relative">
                <FileText className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />

                <input
                  type="text"
                  value={title}
                  onChange={(e) =>
                    setTitle(
                      e.target
                        .value
                    )
                  }
                  placeholder="Enter note title..."
                  className="w-full rounded-xl border border-white/10 bg-[#0f172a] py-2.5 pl-10 pr-4 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-blue-400/40"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Description
              </label>

              <textarea
                rows={4}
                value={
                  description
                }
                onChange={(e) =>
                  setDescription(
                    e.target
                      .value
                  )
                }
                placeholder="Add a short description..."
                className="w-full resize-none rounded-xl border border-white/10 bg-[#0f172a] px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-blue-400/40"
              />
            </div>

            {/* Labels */}
            {availableLabels.length >
              0 && (
              <div>
                <label className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-300">
                  <Tag className="h-4 w-4" />

                  Labels
                </label>

                <div className="flex flex-wrap gap-2">
                  {availableLabels.map(
                    (
                      label
                    ) => {
                      const isSelected =
                        selectedLabels.includes(
                          label._id
                        );

                      return (
                        <button
                          key={
                            label._id
                          }
                          type="button"
                          onClick={() =>
                            toggleLabel(
                              label._id
                            )
                          }
                          className="rounded-full border px-3 py-1.5 text-xs font-medium transition"
                          style={{
                            backgroundColor:
                              isSelected
                                ? `${label.color}20`
                                : "transparent",

                            borderColor:
                              isSelected
                                ? `${label.color}40`
                                : "#273244",

                            color:
                              isSelected
                                ? label.color
                                : "#94a3b8",
                          }}
                        >
                          {
                            label.name
                          }
                        </button>
                      );
                    }
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/[0.05] hover:text-white"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={
                isUploading
              }
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-500 disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />

                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />

                  Upload Note
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}