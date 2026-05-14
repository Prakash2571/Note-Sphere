/**
 * app/dashboard/shared/page.tsx
 * Shows all notes that the user has shared publicly.
 */

"use client";

import { useState, useEffect } from "react";
import { Share2, ExternalLink, Copy, Check, Trash2, FileText, Loader2 } from "lucide-react";
import { formatDate, formatFileSize } from "@/lib/utils";

interface Note {
  _id: string;
  title: string;
  description: string;
  fileSize: number;
  shareToken: string;
  isShared: boolean;
  createdAt: string;
}

export default function SharedNotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/notes")
      .then((r) => r.json())
      .then((d) => {
        const shared = (d.notes || []).filter((n: Note) => n.isShared);
        setNotes(shared);
      })
      .finally(() => setIsLoading(false));
  }, []);

  async function handleCopy(token: string, id: string) {
    const url = `${window.location.origin}/shared/${token}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function handleRevoke(noteId: string) {
    if (!confirm("Revoke this share link?")) return;

    await fetch(`/api/notes/${noteId}/share`, { method: "DELETE" });
    setNotes((prev) => prev.filter((n) => n._id !== noteId));
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Shared Notes</h1>
        <p className="text-slate-400 text-sm mt-1">
          Notes you&apos;ve made publicly accessible via share links.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
        </div>
      ) : notes.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-24 text-center">
          <Share2 className="w-14 h-14 text-slate-700" />
          <h3 className="text-lg font-semibold text-slate-400">No shared notes yet</h3>
          <p className="text-slate-600 text-sm max-w-xs">
            Open any note in your dashboard and click the share button to generate a public link.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => {
            const shareUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/shared/${note.shareToken}`;
            return (
              <div
                key={note._id}
                className="bg-[#111827] border border-[#1e2d45] rounded-2xl p-5 flex items-center gap-4"
              >
                {/* Icon */}
                <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-red-400" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white text-sm truncate">{note.title}</h3>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">
                    {shareUrl}
                  </p>
                  <p className="text-xs text-slate-600 mt-1">
                    {formatFileSize(note.fileSize)} · Shared on {formatDate(note.createdAt)}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleCopy(note.shareToken, note._id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 text-xs font-medium transition-all"
                  >
                    {copiedId === note._id ? (
                      <><Check className="w-3.5 h-3.5" /> Copied</>
                    ) : (
                      <><Copy className="w-3.5 h-3.5" /> Copy</>
                    )}
                  </button>
                  <a
                    href={shareUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg bg-[#1a2235] text-slate-400 hover:text-white transition-all"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <button
                    onClick={() => handleRevoke(note._id)}
                    className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
