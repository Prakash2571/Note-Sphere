/**
 * components/dashboard/NotesList.tsx
 */

"use client";

import { useEffect } from "react";

import {
  FileText,
  Loader2,
  Search,
  Sparkles,
  Upload,
} from "lucide-react";

import { useAppDispatch, useAppSelector }
from "@/store/hooks";

import {
  fetchNotes,
  deleteNote,
  selectFilteredNotes,
  selectNoteById,
} from "@/store/slices/notesSlice";

import {
  openPreview,
  closePreview,
  openShare,
  closeShare,
  openSummarize,
  closeSummarize,
  openUploadModal,
} from "@/store/slices/uiSlice";

import { NoteCard }
from "@/components/dashboard/NoteCard";

import { PDFPreviewModal }
from "@/components/modals/PDFPreviewModal";

import { ShareModal }
from "@/components/modals/ShareModal";

import { SummarizePanel }
from "@/components/modals/SummarizePanel";

export function NotesList() {
  const dispatch =
    useAppDispatch();

  /* Redux state */
  const filteredNotes =
    useAppSelector(
      selectFilteredNotes
    );

  const isLoading =
    useAppSelector(
      (state) =>
        state.notes.isLoading
    );

  const searchQuery =
    useAppSelector(
      (state) =>
        state.ui.searchQuery
    );

  const activeLabelId =
    useAppSelector(
      (state) =>
        state.ui.activeLabelId
    );

  const previewNoteId =
    useAppSelector(
      (state) =>
        state.ui.previewNoteId
    );

  const shareNoteId =
    useAppSelector(
      (state) =>
        state.ui.shareNoteId
    );

  const summarizeNoteId =
    useAppSelector(
      (state) =>
        state.ui.summarizeNoteId
    );

  /* Selected notes */
  const previewNote =
    useAppSelector(
      selectNoteById(
        previewNoteId
      )
    );

  const shareNote =
    useAppSelector(
      selectNoteById(
        shareNoteId
      )
    );

  const summarizeNote =
    useAppSelector(
      selectNoteById(
        summarizeNoteId
      )
    );

  /* Fetch notes */
  useEffect(() => {
    dispatch(fetchNotes());
  }, [dispatch]);

  /* Delete */
  function handleDelete(
    noteId: string
  ) {
    const confirmed =
      confirm(
        "Delete this note permanently?"
      );

    if (!confirmed) return;

    dispatch(deleteNote(noteId));
  }

  /* Loading */
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {Array.from({
          length: 8,
        }).map((_, index) => (
          <div
            key={index}
            className="h-64 animate-pulse rounded-3xl border border-white/5 bg-[#111827]"
          />
        ))}
      </div>
    );
  }

  /* Empty state */
  if (
    !filteredNotes ||
    filteredNotes.length === 0
  ) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-white/10 bg-[#111827]/60 px-6 py-20 text-center sm:px-10">
        {searchQuery ? (
          <>
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border border-blue-500/20 bg-blue-500/10">
              <Search className="h-9 w-9 text-blue-400/70" />
            </div>

            <h2 className="text-2xl font-semibold text-white">
              No matching notes
            </h2>

            <p className="mt-3 max-w-md text-sm leading-7 text-slate-400">
              No notes matched
              &nbsp;
              <span className="text-slate-300">
                "{searchQuery}"
              </span>
            </p>
          </>
        ) : (
          <>
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border border-white/10 bg-gradient-to-br from-red-500/10 to-blue-500/10">
              <FileText className="h-9 w-9 text-slate-400" />
            </div>

            <h2 className="text-2xl font-semibold text-white">
              No notes yet
            </h2>

            <p className="mt-3 max-w-md text-sm leading-7 text-slate-400">
              Upload your first PDF
              to organize documents,
              generate AI summaries,
              and share notes.
            </p>

            <button
              onClick={() =>
                dispatch(
                  openUploadModal()
                )
              }
              className="mt-7 flex items-center gap-2 rounded-2xl bg-gradient-to-r from-red-600 to-red-500 px-6 py-3 text-sm font-medium text-white transition hover:scale-[1.02] hover:from-red-500 hover:to-red-400"
            >
              <Upload className="h-4 w-4" />

              Upload PDF
            </button>

            <div className="mt-5 flex items-center gap-2 text-xs text-slate-500">
              <Sparkles className="h-3.5 w-3.5 text-purple-400/70" />

              AI summaries powered
              by Gemini
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <>
      {/* Count */}
      <div className="mb-5 text-sm text-slate-400">
        {filteredNotes.length}
        &nbsp;
        {filteredNotes.length ===
        1
          ? "note"
          : "notes"}

        {activeLabelId &&
          " in this label"}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {filteredNotes.map(
          (note: any) => (
            <NoteCard
              key={note._id}
              note={note}
              onPreview={() =>
                dispatch(
                  openPreview(
                    note._id
                  )
                )
              }
              onShare={() =>
                dispatch(
                  openShare(
                    note._id
                  )
                )
              }
              onSummarize={() =>
                dispatch(
                  openSummarize(
                    note._id
                  )
                )
              }
              onDelete={() =>
                handleDelete(
                  note._id
                )
              }
            />
          )
        )}
      </div>

      {/* Preview Modal */}
      {previewNote && (
        <PDFPreviewModal
          note={previewNote}
          onClose={() =>
            dispatch(
              closePreview()
            )
          }
        />
      )}

      {/* Share Modal */}
      {shareNote && (
        <ShareModal
          note={shareNote}
          onClose={() =>
            dispatch(
              closeShare()
            )
          }
          onUpdate={() =>
            dispatch(fetchNotes())
          }
        />
      )}

      {/* Summarize Modal */}
      {summarizeNote && (
        <SummarizePanel
          note={summarizeNote}
          onClose={() =>
            dispatch(
              closeSummarize()
            )
          }
          onUpdate={() =>
            dispatch(fetchNotes())
          }
        />
      )}
    </>
  );
}