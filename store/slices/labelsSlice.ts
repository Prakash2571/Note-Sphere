/**
 * store/slices/labelsSlice.ts
 *
 * Manages all label state and the API calls that mutate it.
 * Used by Sidebar, Labels page, and the Upload modal's label picker.
 */

import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
} from "@reduxjs/toolkit";

export interface Label {
  _id:        string;
  name:       string;
  color:      string;
  noteCount:  number;
  createdAt?: string;
  updatedAt?: string;
}

interface LabelsState {
  items:     Label[];
  isLoading: boolean;
  error:     string | null;
}

const initialState: LabelsState = {
  items:     [],
  isLoading: false,
  error:     null,
};

// ── Async thunks ─────────────────────────────────────────────────────────────

export const fetchLabels = createAsyncThunk<Label[]>(
  "labels/fetchAll",
  async () => {
    const res  = await fetch("/api/labels");
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Failed to fetch labels");
    return data.labels as Label[];
  }
);

export const createLabel = createAsyncThunk<Label, { name: string; color: string }>(
  "labels/create",
  async ({ name, color }) => {
    const res  = await fetch("/api/labels", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ name, color }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Failed to create label");
    return data.label as Label;
  }
);

export const updateLabel = createAsyncThunk<
  Label,
  { id: string; name?: string; color?: string }
>(
  "labels/update",
  async ({ id, ...updates }) => {
    const res  = await fetch(`/api/labels/${id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(updates),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Failed to update label");
    return data.label as Label;
  }
);

export const deleteLabel = createAsyncThunk<string, string>(
  "labels/delete",
  async (id) => {
    const res = await fetch(`/api/labels/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error ?? "Failed to delete label");
    }
    return id; // return the deleted id so the reducer can remove it
  }
);

// ── Slice ───────────────────────────────────────────────────────────────────

const labelsSlice = createSlice({
  name: "labels",
  initialState,
  reducers: {
    // Local-only count adjustments (used after note CRUD operations)
    incrementNoteCount: (state, action: PayloadAction<string[]>) => {
      action.payload.forEach((id) => {
        const label = state.items.find((l) => l._id === id);
        if (label) label.noteCount += 1;
      });
    },
    decrementNoteCount: (state, action: PayloadAction<string[]>) => {
      action.payload.forEach((id) => {
        const label = state.items.find((l) => l._id === id);
        if (label && label.noteCount > 0) label.noteCount -= 1;
      });
    },
  },
  extraReducers: (builder) => {
    builder
      // ── fetchLabels ─────────────────────────────────────────────────────
      .addCase(fetchLabels.pending,   (state) => {
        state.isLoading = true;
        state.error     = null;
      })
      .addCase(fetchLabels.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items     = action.payload;
      })
      .addCase(fetchLabels.rejected,  (state, action) => {
        state.isLoading = false;
        state.error     = action.error.message ?? "Failed to load labels";
      })

      // ── createLabel ─────────────────────────────────────────────────────
      .addCase(createLabel.fulfilled, (state, action) => {
        state.items.push(action.payload);
        state.items.sort((a, b) => a.name.localeCompare(b.name));
      })

      // ── updateLabel ─────────────────────────────────────────────────────
      .addCase(updateLabel.fulfilled, (state, action) => {
        const idx = state.items.findIndex((l) => l._id === action.payload._id);
        if (idx !== -1) state.items[idx] = action.payload;
      })

      // ── deleteLabel ─────────────────────────────────────────────────────
      .addCase(deleteLabel.fulfilled, (state, action) => {
        state.items = state.items.filter((l) => l._id !== action.payload);
      });
  },
});

export const { incrementNoteCount, decrementNoteCount } = labelsSlice.actions;
export default labelsSlice.reducer;
