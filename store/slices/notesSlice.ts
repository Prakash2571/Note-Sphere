/**
 * store/slices/notesSlice.ts
 *
 * Manages the entire notes collection and all server interactions.
 *
 * Why this slice owns *all* note state:
 *  - Single source of truth — every component reads the same data
 *  - No more passing notes through props or duplicating fetches
 *  - Modals can mutate a note and the dashboard grid updates automatically
 *
 * Filtering (search/label) is handled client-side via selectors so we don't
 * re-fetch every time the user types — the server fetch is only triggered on
 * mount and after mutations.
 */

import {
  createSlice,
  createAsyncThunk,
  createSelector,
  type PayloadAction,
} from "@reduxjs/toolkit";
import type { RootState } from "@/store";
import type { Label } from "./labelsSlice";

export interface Note {
  _id:           string;
  title:         string;
  description:   string;
  s3Url:         string;
  s3Key:         string;
  fileSize:      number;
  pageCount?:    number;
  labels:        Label[];
  summary?:      string;
  isSummarized:  boolean;
  isShared:      boolean;
  shareToken?:   string;
  createdAt:     string;
  updatedAt:     string;
}

interface NotesState {
  items:     Note[];
  isLoading: boolean;
  error:     string | null;
}

const initialState: NotesState = {
  items:     [],
  isLoading: false,
  error:     null,
};

// ── Async thunks ─────────────────────────────────────────────────────────────

export const fetchNotes = createAsyncThunk<Note[]>(
  "notes/fetchAll",
  async () => {
    const res  = await fetch("/api/notes");
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Failed to fetch notes");
    return data.notes as Note[];
  }
);

/**
 * Upload a new PDF note. Takes a FormData with file + metadata.
 * Returns the populated note (with labels resolved).
 */
export const uploadNote = createAsyncThunk<Note, FormData>(
  "notes/upload",
  async (formData) => {
    const res  = await fetch("/api/notes", {
      method: "POST",
      body:   formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Failed to upload note");
    return data.note as Note;
  }
);

export const deleteNote = createAsyncThunk<string, string>(
  "notes/delete",
  async (id) => {
    const res = await fetch(`/api/notes/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error ?? "Failed to delete note");
    }
    return id;
  }
);

export const enableShare = createAsyncThunk<
  { id: string; shareToken: string; shareUrl: string },
  string
>(
  "notes/enableShare",
  async (id) => {
    const res  = await fetch(`/api/notes/${id}/share`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Failed to enable sharing");
    return { id, shareToken: data.shareToken, shareUrl: data.shareUrl };
  }
);

export const revokeShare = createAsyncThunk<string, string>(
  "notes/revokeShare",
  async (id) => {
    const res = await fetch(`/api/notes/${id}/share`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error ?? "Failed to revoke share link");
    }
    return id;
  }
);

export const summarizeNote = createAsyncThunk<
  { id: string; summary: string },
  { id: string; extractedText: string }
>(
  "notes/summarize",
  async ({ id, extractedText }) => {
    const res  = await fetch(`/api/notes/${id}/summarize`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ extractedText }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Failed to generate summary");
    return { id, summary: data.summary as string };
  }
);

// ── Slice ───────────────────────────────────────────────────────────────────

const notesSlice = createSlice({
  name: "notes",
  initialState,
  reducers: {
    // Direct mutation reducer (used when the modal updates a note in place)
    updateNoteLocal: (state, action: PayloadAction<Partial<Note> & { _id: string }>) => {
      const idx = state.items.findIndex((n) => n._id === action.payload._id);
      if (idx !== -1) state.items[idx] = { ...state.items[idx], ...action.payload };
    },
  },
  extraReducers: (builder) => {
    builder
      // ── fetchNotes ──────────────────────────────────────────────────────
      .addCase(fetchNotes.pending,   (state) => {
        state.isLoading = true;
        state.error     = null;
      })
      .addCase(fetchNotes.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items     = action.payload;
      })
      .addCase(fetchNotes.rejected,  (state, action) => {
        state.isLoading = false;
        state.error     = action.error.message ?? "Failed to load notes";
      })

      // ── uploadNote ──────────────────────────────────────────────────────
      .addCase(uploadNote.fulfilled, (state, action) => {
        state.items.unshift(action.payload); // newest first
      })

      // ── deleteNote ──────────────────────────────────────────────────────
      .addCase(deleteNote.fulfilled, (state, action) => {
        state.items = state.items.filter((n) => n._id !== action.payload);
      })

      // ── enableShare ─────────────────────────────────────────────────────
      .addCase(enableShare.fulfilled, (state, action) => {
        const note = state.items.find((n) => n._id === action.payload.id);
        if (note) {
          note.isShared   = true;
          note.shareToken = action.payload.shareToken;
        }
      })

      // ── revokeShare ─────────────────────────────────────────────────────
      .addCase(revokeShare.fulfilled, (state, action) => {
        const note = state.items.find((n) => n._id === action.payload);
        if (note) {
          note.isShared   = false;
          note.shareToken = undefined;
        }
      })

      // ── summarizeNote ───────────────────────────────────────────────────
      .addCase(summarizeNote.fulfilled, (state, action) => {
        const note = state.items.find((n) => n._id === action.payload.id);
        if (note) {
          note.summary      = action.payload.summary;
          note.isSummarized = true;
        }
      });
  },
});

export const { updateNoteLocal } = notesSlice.actions;
export default notesSlice.reducer;

// ── Memoised selectors ──────────────────────────────────────────────────────

/**
 * Returns notes filtered by the current search query and active label.
 * Memoised — only recomputes when notes/search/label actually change.
 */
export const selectFilteredNotes = createSelector(
  [
    (state: RootState) => state.notes.items,
    (state: RootState) => state.ui.searchQuery,
    (state: RootState) => state.ui.activeLabelId,
  ],
  (notes, searchQuery, activeLabelId) => {
    let result = notes;

    if (activeLabelId) {
      result = result.filter((n) => n.labels.some((l) => l._id === activeLabelId));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result  = result.filter((n) => n.title.toLowerCase().includes(q));
    }
    return result;
  }
);

export const selectNoteById = (id: string | null) => (state: RootState) =>
  id ? state.notes.items.find((n) => n._id === id) ?? null : null;

export const selectSharedNotes = (state: RootState) =>
  state.notes.items.filter((n) => n.isShared);
