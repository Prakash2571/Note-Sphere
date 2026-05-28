/**
 * store/index.ts
 *
 * Redux Toolkit store — single source of truth for client-side state.
 *
 * Slices:
 *  - notes:  the user's notes collection + async thunks
 *  - labels: the user's labels + count tracking
 *  - ui:     modal visibility, search query, active label filter
 *
 * Note on serializability:
 *  We use the default Redux Toolkit middleware which warns on
 *  non-serializable values. All our state is plain JSON — no Date
 *  objects, no class instances — so we don't need to disable that check.
 */

import { configureStore } from "@reduxjs/toolkit";
import notesReducer  from "./slices/notesSlice";
import labelsReducer from "./slices/labelsSlice";
import uiReducer     from "./slices/uiSlice";

export const store = configureStore({
  reducer: {
    notes:  notesReducer,
    labels: labelsReducer,
    ui:     uiReducer,
  },
  // DevTools auto-enabled outside production
  devTools: process.env.NODE_ENV !== "production",
});

// ── Inferred types ──────────────────────────────────────────────────────────
export type RootState   = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
