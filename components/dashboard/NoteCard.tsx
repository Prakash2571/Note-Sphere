/**
 * components/dashboard/NoteCard.tsx
 * Individual note card in the grid — shows title, labels, file size, and action buttons.
 */

"use client";

import { FileText, Eye, Sparkles, Share2, Trash2, CheckCircle } from "lucide-react";
import { formatFileSize, formatDate } from "@/lib/utils";

interface Label {
  _id: string;
  name: string;
  color: string;
}

interface Note {
  _id: string;
  title: string;
  description: string;
  fileSize: number;
  labels: Label[];
  isSummarized: boolean;
  isShared: boolean;
  createdAt: string;
}

interface NoteCardProps {
  note: Note;
  onPreview: () => void;
  onShare: () => void;
  onSummarize: () => void;
  onDelete: () => void;
}

export function NoteCard({
  note,
  onPreview,
  onShare,
  onSummarize,
  onDelete,
}: NoteCardProps) {
  return (
    <div className="group relative bg-[#111827] border border-[#1e2d45] hover:border-blue-500/30 rounded-2xl p-5 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-900/20 flex flex-col gap-3">
      {/* PDF icon + title */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
          <FileText className="w-5 h-5 text-red-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white text-sm leading-snug line-clamp-2">
            {note.title}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">{formatFileSize(note.fileSize)}</p>
        </div>
      </div>

      {/* Description */}
      {note.description && (
        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
          {note.description}
        </p>
      )}

      {/* Labels */}
      {note.labels.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {note.labels.slice(0, 3).map((label) => (
            <span
              key={label._id}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
              style={{
                backgroundColor: `${label.color}20`,
                color: label.color,
                border: `1px solid ${label.color}30`,
              }}
            >
              {label.name}
            </span>
          ))}
          {note.labels.length > 3 && (
            <span className="text-xs text-slate-500">+{note.labels.length - 3}</span>
          )}
        </div>
      )}

      {/* Status badges */}
      <div className="flex items-center gap-2 flex-wrap">
        {note.isSummarized && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <CheckCircle className="w-3 h-3" />
            Summarized
          </span>
        )}
        {note.isShared && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-500/10 border border-green-500/20 text-green-400">
            <Share2 className="w-3 h-3" />
            Shared
          </span>
        )}
      </div>

      {/* Date */}
      <p className="text-xs text-slate-600">{formatDate(note.createdAt)}</p>

      {/* Action buttons — visible on hover */}
      <div className="flex items-center gap-1.5 pt-1 border-t border-[#1e2d45]">
        <button
          onClick={onPreview}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 hover:text-blue-300 text-xs font-medium transition-all"
          title="Preview PDF"
        >
          <Eye className="w-3.5 h-3.5" />
          Preview
        </button>

        <button
          onClick={onSummarize}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-purple-600/10 hover:bg-purple-600/20 text-purple-400 hover:text-purple-300 text-xs font-medium transition-all"
          title="AI Summarize"
        >
          <Sparkles className="w-3.5 h-3.5" />
          {note.isSummarized ? "Summary" : "Summarize"}
        </button>

        <button
          onClick={onShare}
          className="p-1.5 rounded-lg bg-green-600/10 hover:bg-green-600/20 text-green-400 hover:text-green-300 transition-all"
          title="Share"
        >
          <Share2 className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onDelete}
          className="p-1.5 rounded-lg bg-red-600/10 hover:bg-red-600/20 text-red-400 hover:text-red-300 transition-all"
          title="Delete"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
