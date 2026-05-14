/**
 * components/dashboard/NotesList.tsx
 * Fetches and renders the grid of note cards.
 * Listens to custom events for search and refresh triggers.
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { FileText, Search, Upload } from "lucide-react";
import { NoteCard } from "@/components/dashboard/NoteCard";
import { PDFPreviewModal } from "@/components/modals/PDFPreviewModal";
import { ShareModal } from "@/components/modals/ShareModal";
import { SummarizePanel } from "@/components/modals/SummarizePanel";

interface Label {
  _id: string;
  name: string;
  color: string;
}

interface Note {
  _id: string;
  title: string;
  description: string;
  s3Url: string;
  s3Key: string;
  fileSize: number;
  pageCount?: number;
  labels: Label[];
  summary?: string;
  isSummarized: boolean;
  isShared: boolean;
  shareToken?: string;
  createdAt: string;
}

export function NotesList() {
  const searchParams = useSearchParams();
  const labelFilter = searchParams.get("label");

  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal states
  const [previewNote, setPreviewNote] = useState<Note | null>(null);
  const [shareNote, setShareNote] = useState<Note | null>(null);
  const [summarizeNote, setSummarizeNote] = useState<Note | null>(null);

  // ── Fetch notes ────────────────────────────────────────────────────────────
  const fetchNotes = useCallback(async (search = "", label = labelFilter) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (label) params.set("label", label);

      const res = await fetch(`/api/notes?${params.toString()}`);
      const data = await res.json();
      setNotes(data.notes || []);
    } catch {
      console.error("Failed to fetch notes");
    } finally {
      setIsLoading(false);
    }
  }, [labelFilter]);

  // Initial load and label filter changes
  useEffect(() => {
    fetchNotes(searchQuery, labelFilter);
  }, [labelFilter, fetchNotes]);

  // Listen for global search event from the header
  useEffect(() => {
    function handleSearch(e: Event) {
      const query = (e as CustomEvent).detail as string;
      setSearchQuery(query);
      fetchNotes(query, labelFilter);
    }
    function handleRefresh() {
      fetchNotes(searchQuery, labelFilter);
    }

    window.addEventListener("notesSearch", handleSearch);
    window.addEventListener("notesRefresh", handleRefresh);
    return () => {
      window.removeEventListener("notesSearch", handleSearch);
      window.removeEventListener("notesRefresh", handleRefresh);
    };
  }, [fetchNotes, searchQuery, labelFilter]);

  // ── Delete note handler ────────────────────────────────────────────────────
  async function handleDelete(noteId: string) {
    if (!confirm("Are you sure you want to delete this note? This cannot be undone.")) return;

    try {
      await fetch(`/api/notes/${noteId}`, { method: "DELETE" });
      setNotes((prev) => prev.filter((n) => n._id !== noteId));
    } catch {
      alert("Failed to delete note");
    }
  }

  // ── Render states ──────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-52 rounded-2xl bg-[#111827] border border-[#1e2d45] animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        {searchQuery ? (
          <>
            <Search className="w-14 h-14 text-slate-700 mb-4" />
            <h3 className="text-lg font-semibold text-slate-400 mb-2">No results found</h3>
            <p className="text-slate-600 text-sm">
              No notes match &ldquo;{searchQuery}&rdquo;. Try a different search term.
            </p>
          </>
        ) : (
          <>
            <FileText className="w-14 h-14 text-slate-700 mb-4" />
            <h3 className="text-lg font-semibold text-slate-400 mb-2">No notes yet</h3>
            <p className="text-slate-600 text-sm mb-6">
              Upload your first PDF to get started.
            </p>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("openUploadModal"))}
              className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-500 text-white px-5 py-2.5 rounded-xl font-medium text-sm"
            >
              <Upload className="w-4 h-4" />
              Upload PDF
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <>
      {/* Notes count */}
      <p className="text-sm text-slate-500 mb-4">
        {notes.length} note{notes.length !== 1 ? "s" : ""}
        {labelFilter ? " in this label" : ""}
      </p>

      {/* Notes grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {notes.map((note) => (
          <NoteCard
            key={note._id}
            note={note}
            onPreview={() => setPreviewNote(note)}
            onShare={() => setShareNote(note)}
            onSummarize={() => setSummarizeNote(note)}
            onDelete={() => handleDelete(note._id)}
          />
        ))}
      </div>

      {/* Modals */}
      {previewNote && (
        <PDFPreviewModal
          note={previewNote}
          onClose={() => setPreviewNote(null)}
        />
      )}

      {shareNote && (
        <ShareModal
          note={shareNote}
          onClose={() => setShareNote(null)}
          onUpdate={(updated) => {
            setNotes((prev) =>
              prev.map((n) => (n._id === updated._id ? { ...n, ...updated } : n))
            );
          }}
        />
      )}

      {summarizeNote && (
        <SummarizePanel
          note={summarizeNote}
          onClose={() => setSummarizeNote(null)}
          onUpdate={(updated) => {
            setNotes((prev) =>
              prev.map((n) => (n._id === updated._id ? { ...n, ...updated } : n))
            );
          }}
        />
      )}
    </>
  );
}
