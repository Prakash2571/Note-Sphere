/**
 * store/slices/uiSlice.ts
 *
 * Global UI state — modals, filters, search.
 * Replaces the previous `window.dispatchEvent` custom-event hack
 * and per-component useState scattered across the dashboard.
 *
 * Design choice: we only store *which* note id is active in each modal,
 * not the full note object. The note data itself lives in notesSlice
 * (single source of truth). Components read the live note via a selector.
 */

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface UiState {
  // Modal state — null when closed, note id when open
  uploadOpen:        boolean;
  previewNoteId:     string | null;
  shareNoteId:       string | null;
  summarizeNoteId:   string | null;

  // Dashboard filters
  searchQuery:       string;
  activeLabelId:     string | null;
}

const initialState: UiState = {
  uploadOpen:      false,
  previewNoteId:   null,
  shareNoteId:     null,
  summarizeNoteId: null,
  searchQuery:     "",
  activeLabelId:   null,
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    // ── Upload modal ────────────────────────────────────────────────────────
    openUploadModal:    (state) => { state.uploadOpen = true;  },
    closeUploadModal:   (state) => { state.uploadOpen = false; },

    // ── Preview modal ───────────────────────────────────────────────────────
    openPreview:        (state, action: PayloadAction<string>) => { state.previewNoteId = action.payload; },
    closePreview:       (state) => { state.previewNoteId = null; },

    // ── Share modal ─────────────────────────────────────────────────────────
    openShare:          (state, action: PayloadAction<string>) => { state.shareNoteId = action.payload; },
    closeShare:         (state) => { state.shareNoteId = null; },

    // ── Summarize panel ─────────────────────────────────────────────────────
    openSummarize:      (state, action: PayloadAction<string>) => { state.summarizeNoteId = action.payload; },
    closeSummarize:     (state) => { state.summarizeNoteId = null; },

    // ── Filters ─────────────────────────────────────────────────────────────
    setSearchQuery:     (state, action: PayloadAction<string>)         => { state.searchQuery   = action.payload; },
    setActiveLabel:     (state, action: PayloadAction<string | null>)  => { state.activeLabelId = action.payload; },
    clearFilters:       (state) => { state.searchQuery = ""; state.activeLabelId = null; },
  },
});

export const {
  openUploadModal,    closeUploadModal,
  openPreview,        closePreview,
  openShare,          closeShare,
  openSummarize,      closeSummarize,
  setSearchQuery,     setActiveLabel,    clearFilters,
} = uiSlice.actions;

export default uiSlice.reducer;
