"use client";

import {
  CheckCircle,
  Eye,
  FileText,
  Share2,
  Sparkles,
  Trash2,
} from "lucide-react";

import {
  formatDate,
  formatFileSize,
} from "@/lib/utils";

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
    <div
      className="
        group
        relative
        flex
        h-full
        flex-col
        overflow-hidden
        rounded-3xl
        border
        border-slate-800/80
        bg-gradient-to-br
        from-[#0f172a]
        via-[#111827]
        to-[#1e293b]
        p-5
        shadow-[0_0_0_1px_rgba(255,255,255,0.02)]
        transition-all
        duration-300
        hover:-translate-y-1
        hover:border-blue-500/30
        hover:shadow-[0_20px_60px_rgba(37,99,235,0.15)]
      "
    >
      {/* Glow effect */}
      <div
        className="
          pointer-events-none
          absolute
          inset-0
          opacity-0
          transition-opacity
          duration-300
          group-hover:opacity-100
        "
      >
        <div
          className="
            absolute
            -top-24
            right-0
            h-40
            w-40
            rounded-full
            bg-blue-500/10
            blur-3xl
          "
        />

        <div
          className="
            absolute
            bottom-0
            left-0
            h-32
            w-32
            rounded-full
            bg-violet-500/10
            blur-3xl
          "
        />
      </div>

      {/* Top */}
      <div className="relative z-10 flex items-start gap-4">
        {/* Icon */}
        <div
          className="
            flex
            h-14
            w-14
            shrink-0
            items-center
            justify-center
            rounded-2xl
            border
            border-red-500/20
            bg-gradient-to-br
            from-red-500/20
            to-rose-500/10
            backdrop-blur-sm
          "
        >
          <FileText className="h-6 w-6 text-red-400" />
        </div>

        {/* Title */}
        <div className="min-w-0 flex-1">
          <h3
            className="
              line-clamp-2
              break-words
              text-[15px]
              font-semibold
              leading-6
              tracking-tight
              text-white
              sm:text-base
            "
          >
            {note.title}
          </h3>

          <p className="mt-1 text-xs text-slate-400">
            {formatFileSize(note.fileSize)}
          </p>
        </div>
      </div>

      {/* Description */}
      {note.description && (
        <p
          className="
            relative
            z-10
            mt-5
            line-clamp-3
            text-sm
            leading-6
            text-slate-400
          "
        >
          {note.description}
        </p>
      )}

      {/* Labels */}
      {note.labels?.length > 0 && (
        <div className="relative z-10 mt-5 flex flex-wrap gap-2">
          {note.labels.slice(0, 3).map((label) => (
            <span
              key={label._id}
              className="
                inline-flex
                items-center
                rounded-full
                border
                px-3
                py-1
                text-xs
                font-medium
                backdrop-blur-sm
              "
              style={{
                backgroundColor: `${label.color}15`,
                borderColor: `${label.color}40`,
                color: label.color,
              }}
            >
              {label.name}
            </span>
          ))}

          {note.labels.length > 3 && (
            <span className="inline-flex items-center text-xs text-slate-500">
              +{note.labels.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Status */}
      {(note.isSummarized || note.isShared) && (
        <div className="relative z-10 mt-5 flex flex-wrap gap-2">
          {note.isSummarized && (
            <div
              className="
                inline-flex
                items-center
                gap-1.5
                rounded-full
                border
                border-emerald-500/20
                bg-emerald-500/10
                px-3
                py-1
                text-xs
                font-medium
                text-emerald-400
              "
            >
              <CheckCircle className="h-3.5 w-3.5" />
              Summarized
            </div>
          )}

          {note.isShared && (
            <div
              className="
                inline-flex
                items-center
                gap-1.5
                rounded-full
                border
                border-violet-500/20
                bg-violet-500/10
                px-3
                py-1
                text-xs
                font-medium
                text-violet-400
              "
            >
              <Share2 className="h-3.5 w-3.5" />
              Shared
            </div>
          )}
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Footer */}
      <div className="relative z-10 mt-6 border-t border-white/5 pt-4">
        <div className="mb-4 text-xs text-slate-500">
          {formatDate(note.createdAt)}
        </div>

        {/* Buttons */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {/* Preview */}
          <button
            onClick={onPreview}
            className="
              flex
              h-11
              items-center
              justify-center
              gap-1.5
              rounded-2xl
              border
              border-blue-500/10
              bg-blue-500/10
              px-3
              text-xs
              font-medium
              text-blue-400
              transition
              hover:bg-blue-500/20
            "
          >
            <Eye className="h-4 w-4 shrink-0" />

            <span className="truncate">
              Preview
            </span>
          </button>

          {/* Summarize */}
          <button
            onClick={onSummarize}
            className="
              flex
              h-11
              items-center
              justify-center
              gap-1.5
              rounded-2xl
              border
              border-violet-500/10
              bg-violet-500/10
              px-3
              text-xs
              font-medium
              text-violet-400
              transition
              hover:bg-violet-500/20
            "
          >
            <Sparkles className="h-4 w-4 shrink-0" />

            <span className="truncate">
              {note.isSummarized
                ? "Summary"
                : "Summarize"}
            </span>
          </button>

          {/* Share */}
          <button
            onClick={onShare}
            className="
              flex
              h-11
              items-center
              justify-center
              rounded-2xl
              border
              border-emerald-500/10
              bg-emerald-500/10
              text-emerald-400
              transition
              hover:bg-emerald-500/20
            "
          >
            <Share2 className="h-4 w-4" />
          </button>

          {/* Delete */}
          <button
            onClick={onDelete}
            className="
              flex
              h-11
              items-center
              justify-center
              rounded-2xl
              border
              border-red-500/10
              bg-red-500/10
              text-red-400
              transition
              hover:bg-red-500/20
            "
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}