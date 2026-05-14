/**
 * app/dashboard/labels/page.tsx
 * Labels management page — create, rename, recolor, and delete labels.
 */

"use client";

import { useState, useEffect } from "react";
import { Tag, Plus, Trash2, Pencil, Check, X, Loader2 } from "lucide-react";
import { LABEL_COLORS, randomLabelColor } from "@/lib/utils";

interface Label {
  _id: string;
  name: string;
  color: string;
  noteCount: number;
}

export default function LabelsPage() {
  const [labels, setLabels] = useState<Label[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(randomLabelColor());
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [error, setError] = useState("");

  // ── Fetch labels ───────────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/labels")
      .then((r) => r.json())
      .then((d) => setLabels(d.labels || []))
      .finally(() => setIsLoading(false));
  }, []);

  // ── Create label ───────────────────────────────────────────────────────────
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setIsCreating(true);
    setError("");

    try {
      const res = await fetch("/api/labels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), color: newColor }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setLabels((prev) => [...prev, data.label]);
      setNewName("");
      setNewColor(randomLabelColor());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create label");
    } finally {
      setIsCreating(false);
    }
  }

  // ── Save edit ──────────────────────────────────────────────────────────────
  async function handleSaveEdit(labelId: string) {
    try {
      const res = await fetch(`/api/labels/${labelId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), color: editColor }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setLabels((prev) =>
        prev.map((l) => (l._id === labelId ? data.label : l))
      );
      setEditingId(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update label");
    }
  }

  // ── Delete label ───────────────────────────────────────────────────────────
  async function handleDelete(labelId: string, noteCount: number) {
    const msg =
      noteCount > 0
        ? `Delete this label? It will be removed from ${noteCount} note${noteCount > 1 ? "s" : ""}.`
        : "Delete this label?";

    if (!confirm(msg)) return;

    try {
      await fetch(`/api/labels/${labelId}`, { method: "DELETE" });
      setLabels((prev) => prev.filter((l) => l._id !== labelId));
    } catch {
      alert("Failed to delete label");
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Labels</h1>
        <p className="text-slate-400 text-sm mt-1">
          Organize your notes with color-coded labels.
        </p>
      </div>

      {/* Create label form */}
      <div className="bg-[#111827] border border-[#1e2d45] rounded-2xl p-6 mb-6">
        <h2 className="text-sm font-semibold text-slate-300 mb-4">Create New Label</h2>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleCreate} className="flex items-end gap-3">
          {/* Color picker */}
          <div className="flex-shrink-0">
            <label className="text-xs text-slate-500 block mb-1.5">Color</label>
            <div className="flex gap-1.5 flex-wrap max-w-[120px]">
              {LABEL_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setNewColor(color)}
                  className="w-6 h-6 rounded-full border-2 transition-all"
                  style={{
                    backgroundColor: color,
                    borderColor: newColor === color ? "white" : "transparent",
                    transform: newColor === color ? "scale(1.2)" : "scale(1)",
                  }}
                />
              ))}
            </div>
          </div>

          {/* Name input */}
          <div className="flex-1">
            <label className="text-xs text-slate-500 block mb-1.5">Label name</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Physics, Lecture Notes..."
              className="w-full bg-[#0d1526] border border-[#1e2d45] focus:border-blue-500 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-600 outline-none transition-colors text-sm"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isCreating || !newName.trim()}
            className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white px-4 py-2.5 rounded-xl font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          >
            {isCreating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            Create
          </button>
        </form>
      </div>

      {/* Labels list */}
      <div className="bg-[#111827] border border-[#1e2d45] rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#1e2d45]">
          <h2 className="text-sm font-semibold text-slate-300">
            Your Labels{" "}
            <span className="text-slate-500 font-normal">({labels.length})</span>
          </h2>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
          </div>
        ) : labels.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <Tag className="w-10 h-10 text-slate-700" />
            <p className="text-slate-500 text-sm">No labels yet. Create one above.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#1e2d45]">
            {labels.map((label) => (
              <div key={label._id} className="flex items-center gap-4 px-6 py-4">
                {editingId === label._id ? (
                  /* ── Edit mode ─── */
                  <div className="flex items-center gap-3 flex-1">
                    {/* Color picker in edit */}
                    <div className="flex gap-1.5 flex-wrap max-w-[80px]">
                      {LABEL_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setEditColor(color)}
                          className="w-4 h-4 rounded-full border-2 transition-all"
                          style={{
                            backgroundColor: color,
                            borderColor: editColor === color ? "white" : "transparent",
                          }}
                        />
                      ))}
                    </div>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 bg-[#0d1526] border border-blue-500 rounded-lg px-3 py-1.5 text-slate-100 outline-none text-sm"
                      autoFocus
                    />
                    <div className="flex gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => handleSaveEdit(label._id)}
                        className="p-1.5 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-1.5 rounded-lg bg-[#1a2235] text-slate-400 hover:bg-[#1e2a42]"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ── Display mode ─── */
                  <>
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: label.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-slate-300">{label.name}</span>
                      <span className="text-xs text-slate-600 ml-2">
                        {label.noteCount} note{label.noteCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => {
                          setEditingId(label._id);
                          setEditName(label.name);
                          setEditColor(label.color);
                        }}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-all"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(label._id, label.noteCount)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
