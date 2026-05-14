/**
 * components/modals/UploadModal.tsx
 * Modal for uploading a new PDF note.
 * Handles file selection, title/description, and label assignment.
 */

"use client";

import { useState, useEffect, useRef } from "react";
import {
  X,
  Upload,
  FileText,
  Loader2,
  CheckCircle,
  Tag,
  AlertCircle,
} from "lucide-react";
import { formatFileSize } from "@/lib/utils";

interface Label {
  _id: string;
  name: string;
  color: string;
}

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function UploadModal({ isOpen, onClose, onSuccess }: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [availableLabels, setAvailableLabels] = useState<Label[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch available labels when modal opens
  useEffect(() => {
    if (isOpen) {
      fetch("/api/labels")
        .then((r) => r.json())
        .then((d) => setAvailableLabels(d.labels || []));
    }
  }, [isOpen]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFile(null);
      setTitle("");
      setDescription("");
      setSelectedLabels([]);
      setError("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // ── File selection ─────────────────────────────────────────────────────────
  function handleFileSelect(selectedFile: File) {
    if (selectedFile.type !== "application/pdf") {
      setError("Only PDF files are allowed.");
      return;
    }
    if (selectedFile.size > 50 * 1024 * 1024) {
      setError("File size must be under 50MB.");
      return;
    }
    setError("");
    setFile(selectedFile);
    // Auto-fill title from filename (without .pdf extension)
    if (!title) {
      setTitle(selectedFile.name.replace(/\.pdf$/i, "").replace(/[-_]/g, " "));
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFileSelect(dropped);
  }

  // ── Label toggle ───────────────────────────────────────────────────────────
  function toggleLabel(labelId: string) {
    setSelectedLabels((prev) =>
      prev.includes(labelId) ? prev.filter((id) => id !== labelId) : [...prev, labelId]
    );
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return setError("Please select a PDF file.");
    if (!title.trim()) return setError("Please enter a title.");

    setIsUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", title.trim());
      formData.append("description", description.trim());
      formData.append("labels", JSON.stringify(selectedLabels));

      const res = await fetch("/api/notes", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Upload failed. Please try again.");
        return;
      }

      onSuccess();
    } catch {
      setError("Upload failed. Please check your connection and try again.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-[#111827] border border-[#1e2d45] rounded-2xl w-full max-w-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e2d45]">
          <div>
            <h2 className="text-lg font-semibold text-white">Upload PDF Note</h2>
            <p className="text-xs text-slate-500 mt-0.5">Max 50MB per file</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white p-1.5 rounded-lg hover:bg-[#1a2235] transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[80vh]">
          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
              isDragging
                ? "border-blue-500 bg-blue-500/10"
                : file
                ? "border-green-500/50 bg-green-500/5"
                : "border-[#1e2d45] hover:border-blue-500/50 hover:bg-[#1a2235]"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              className="hidden"
            />

            {file ? (
              <div className="flex flex-col items-center gap-2">
                <CheckCircle className="w-8 h-8 text-green-400" />
                <p className="font-medium text-green-400 text-sm">{file.name}</p>
                <p className="text-xs text-slate-500">{formatFileSize(file.size)}</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Upload className="w-6 h-6 text-blue-400" />
                </div>
                <p className="text-sm text-slate-300 font-medium">
                  Drop PDF here or click to browse
                </p>
                <p className="text-xs text-slate-600">Supports PDF files up to 50MB</p>
              </div>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Title <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="Enter note title..."
                className="w-full bg-[#0d1526] border border-[#1e2d45] focus:border-blue-500 rounded-xl pl-9 pr-4 py-2.5 text-slate-100 placeholder-slate-600 outline-none transition-colors text-sm"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Description{" "}
              <span className="text-slate-600 font-normal">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this note about?"
              rows={3}
              className="w-full bg-[#0d1526] border border-[#1e2d45] focus:border-blue-500 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-600 outline-none transition-colors text-sm resize-none"
            />
          </div>

          {/* Labels */}
          {availableLabels.length > 0 && (
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-slate-300 mb-2">
                <Tag className="w-3.5 h-3.5" />
                Labels{" "}
                <span className="text-slate-600 font-normal">(optional)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {availableLabels.map((label) => {
                  const isSelected = selectedLabels.includes(label._id);
                  return (
                    <button
                      key={label._id}
                      type="button"
                      onClick={() => toggleLabel(label._id)}
                      className="px-3 py-1 rounded-full text-xs font-medium transition-all border"
                      style={{
                        backgroundColor: isSelected ? `${label.color}25` : "transparent",
                        color: isSelected ? label.color : "#64748b",
                        borderColor: isSelected ? `${label.color}50` : "#1e2d45",
                      }}
                    >
                      {label.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-[#1a2235] hover:bg-[#1e2a42] border border-[#2d3f5a] text-slate-300 py-2.5 rounded-xl font-medium text-sm transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading}
              className="flex-1 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white py-2.5 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-red-900/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
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
