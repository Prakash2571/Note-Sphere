/**
 * components/modals/useAnnotations.ts
 *
 * Owns annotation state and network calls for the Viewer, keeping the
 * components thin. Loads all records on mount, exposes a per-page selector, and
 * provides optimistic create / delete / revert operations with the error
 * semantics from the requirements:
 *  - highlight save failure  -> remove the optimistic highlight (Req 1.6)
 *  - scribble save failure   -> retain the rendered scribble  (Req 4.7)
 *  - revert-all failure      -> preserve the local set        (Req 3.7)
 *
 * It also wires the pure undo/redo history reducer (`lib/annotations/history.ts`)
 * around this persistence layer. Create/erase gestures record a history entry
 * that references the FINAL server DTO (creates record only after the POST
 * resolves); `undo`/`redo` execute the side effect the pure layer describes
 * (DELETE or POST) using history-agnostic helpers so they never double-record.
 */

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { NormPoint, NormRect } from "@/lib/annotations/coordinates";
import type { PaletteColor } from "@/lib/annotations/validation";
import type { AnnotationDTO } from "@/lib/annotations/serialize";
import {
  emptyHistory,
  recordAction,
  undo as undoHistory,
  redo as redoHistory,
  clear as clearHistory,
  applyNewId,
  type History,
  type UndoableAction,
} from "@/lib/annotations/history";

const MAX_ANNOTATIONS = 5000;

export interface UseAnnotations {
  annotations: AnnotationDTO[];
  byPage: (page: number) => AnnotationDTO[];
  loading: boolean;
  error: string | null;
  createHighlight: (
    page: number,
    rects: NormRect[],
    color: PaletteColor
  ) => Promise<void>;
  createScribble: (
    page: number,
    points: NormPoint[],
    color: PaletteColor,
    strokeWidth: number
  ) => Promise<void>;
  deleteOne: (annotationId: string) => Promise<void>;
  revertAll: () => Promise<void>;
  canUndo: boolean;
  canRedo: boolean;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
}

let tempCounter = 0;
function tempId(): string {
  tempCounter += 1;
  return `temp-${Date.now()}-${tempCounter}`;
}

/** Build a create POST body from a stored DTO (Req 7.1: preserve mark fields). */
function createPayload(dto: AnnotationDTO) {
  return {
    type: dto.type,
    pageNumber: dto.pageNumber,
    color: dto.color,
    rects: dto.rects,
    points: dto.points,
    strokeWidth: dto.strokeWidth,
  };
}

export function useAnnotations(noteId: string): UseAnnotations {
  const [annotations, setAnnotations] = useState<AnnotationDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<History>(emptyHistory);

  // Holds the pending auto-clear timeout for transient undo/redo errors.
  const errorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sets a transient error that auto-clears after ~4s (undo/redo). Clears any
  // prior pending timeout first so overlapping errors don't clear prematurely.
  const setTransientError = useCallback((msg: string) => {
    setError(msg);
    if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    errorTimeoutRef.current = setTimeout(() => setError(null), 4000);
  }, []);

  // Clear any pending timeout on unmount.
  useEffect(() => {
    return () => {
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    };
  }, []);

  // Keep a ref to the latest annotations for optimistic reconciliation without
  // stale closures.
  const annotationsRef = useRef<AnnotationDTO[]>([]);
  annotationsRef.current = annotations;

  // Mirror the history in a ref so undo/redo read the freshest stacks without
  // stale closures (matches the annotationsRef pattern).
  const historyRef = useRef<History>(emptyHistory);
  historyRef.current = history;

  // Load all records on mount (Req 2.1) — tolerate up to 5000.
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/notes/${noteId}/annotations`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load annotations");
        if (!cancelled) {
          const list: AnnotationDTO[] = Array.isArray(data.annotations)
            ? data.annotations.slice(0, MAX_ANNOTATIONS)
            : [];
          setAnnotations(list);
        }
      } catch {
        if (!cancelled) setError("Failed to load annotations.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [noteId]);

  const byPage = useCallback(
    (page: number) => annotations.filter((a) => a.pageNumber === page),
    [annotations]
  );

  const persist = useCallback(
    async (
      optimistic: AnnotationDTO,
      keepOnFailure: boolean
    ): Promise<AnnotationDTO | null> => {
      // Optimistic render.
      setAnnotations((prev) => [...prev, optimistic]);

      try {
        const res = await fetch(`/api/notes/${noteId}/annotations`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: optimistic.type,
            pageNumber: optimistic.pageNumber,
            color: optimistic.color,
            rects: optimistic.rects,
            points: optimistic.points,
            strokeWidth: optimistic.strokeWidth,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to save annotation");

        // Reconcile the optimistic record with the server-assigned _id.
        const saved: AnnotationDTO = data.annotation;
        setAnnotations((prev) =>
          prev.map((a) => (a._id === optimistic._id ? saved : a))
        );
        return saved;
      } catch {
        if (keepOnFailure) {
          // Scribble: retain the rendered annotation (Req 4.7).
          setError("Failed to save annotation.");
        } else {
          // Highlight: roll back the optimistic annotation (Req 1.6).
          setAnnotations((prev) =>
            prev.filter((a) => a._id !== optimistic._id)
          );
          setError("Failed to save highlight.");
        }
        return null;
      }
    },
    [noteId]
  );

  // --- history-agnostic persistence primitives used by undo/redo ---------
  // These perform the raw server call (and, for create, return the server DTO)
  // WITHOUT recording any history action, so undo/redo can manage the stacks
  // themselves without double-recording.

  const rawCreate = useCallback(
    async (payload: ReturnType<typeof createPayload>): Promise<AnnotationDTO | null> => {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const res = await fetch(`/api/notes/${noteId}/annotations`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          const data = await res.json();
          // Non-ok response is not retried — preserve the existing null-on-failure behavior.
          if (!res.ok) return null;
          const saved: AnnotationDTO = data.annotation;
          // Guard against a malformed DTO so the stacks never hold an unusable ref.
          if (!saved || !saved._id) throw new Error("Malformed annotation");
          return saved;
        } catch {
          if (attempt === 0) {
            await new Promise((r) => setTimeout(r, 300));
            continue;
          }
          return null;
        }
      }
      return null;
    },
    [noteId]
  );

  const rawDelete = useCallback(
    async (annotationId: string): Promise<boolean> => {
      // Unsaved optimistic mark — nothing persisted to delete.
      if (annotationId.startsWith("temp-")) return true;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const res = await fetch(
            `/api/notes/${noteId}/annotations/${annotationId}`,
            { method: "DELETE" }
          );
          // Idempotent: already-absent (404) counts as success.
          if (res.ok || res.status === 404) return true;
          return false; // genuine server error (e.g. 500) — do not retry
        } catch {
          if (attempt === 0) {
            await new Promise((r) => setTimeout(r, 300));
            continue;
          }
          return false;
        }
      }
      return false;
    },
    [noteId]
  );

  const createHighlight = useCallback(
    async (page: number, rects: NormRect[], color: PaletteColor) => {
      setError(null);
      const now = new Date().toISOString();
      const optimistic: AnnotationDTO = {
        _id: tempId(),
        noteId,
        type: "highlight",
        pageNumber: page,
        color,
        rects,
        points: [],
        createdAt: now,
        updatedAt: now,
      };
      // Record only after the POST resolves with the server DTO (Req 4/8.1);
      // recordAction also clears the redo stack.
      const saved = await persist(optimistic, false);
      if (saved) {
        setHistory((h) => recordAction(h, { kind: "create", annotation: saved }));
      }
    },
    [noteId, persist]
  );

  const createScribble = useCallback(
    async (
      page: number,
      points: NormPoint[],
      color: PaletteColor,
      strokeWidth: number
    ) => {
      setError(null);
      const now = new Date().toISOString();
      const optimistic: AnnotationDTO = {
        _id: tempId(),
        noteId,
        type: "scribble",
        pageNumber: page,
        color,
        rects: [],
        points,
        strokeWidth,
        createdAt: now,
        updatedAt: now,
      };
      // Record only after the POST resolves with the server DTO (Req 4/8.1);
      // recordAction also clears the redo stack.
      const saved = await persist(optimistic, true);
      if (saved) {
        setHistory((h) => recordAction(h, { kind: "create", annotation: saved }));
      }
    },
    [noteId, persist]
  );

  const deleteOne = useCallback(
    async (annotationId: string) => {
      setError(null);
      const snapshot = annotationsRef.current;
      // Resolve the DTO before optimistic removal so an erase can be undone.
      const removedDto = snapshot.find((a) => a._id === annotationId);
      // Optimistic removal.
      setAnnotations((prev) => prev.filter((a) => a._id !== annotationId));
      try {
        const res = await fetch(
          `/api/notes/${noteId}/annotations/${annotationId}`,
          { method: "DELETE" }
        );
        if (!res.ok) throw new Error("Failed to delete annotation");
        // Record the erase (eraser path records; undo/redo internals do not).
        if (removedDto) {
          setHistory((h) =>
            recordAction(h, { kind: "erase", annotation: removedDto })
          );
        }
      } catch {
        // Restore on failure.
        setAnnotations(snapshot);
        setError("Failed to delete annotation.");
      }
    },
    [noteId]
  );

  const undo = useCallback(async () => {
    setError(null);
    const annotationsSnapshot = annotationsRef.current;
    const historySnapshot = historyRef.current;
    const { history: next, effect } = undoHistory(historyRef.current);
    if (effect.op === "none") return;

    if (effect.op === "delete") {
      // Undoing a create: remove the mark and DELETE it on the server.
      const target = effect.annotation;
      setAnnotations((prev) => prev.filter((a) => a._id !== target._id));
      const ok = await rawDelete(target._id);
      if (!ok) {
        setAnnotations(annotationsSnapshot);
        setHistory(historySnapshot);
        setTransientError("Failed to undo.");
        return;
      }
      setHistory(next);
    } else {
      // Undoing an erase: re-create the mark (server assigns a NEW _id).
      const source = effect.annotation;
      const saved = await rawCreate(createPayload(source));
      if (!saved) {
        setAnnotations(annotationsSnapshot);
        setHistory(historySnapshot);
        setTransientError("Failed to undo.");
        return;
      }
      setAnnotations((prev) => [...prev, saved]);
      // Re-point the moved entry to the new server _id (Req 7.2).
      setHistory(applyNewId(next, source._id, saved));
    }
  }, [rawCreate, rawDelete, setTransientError]);

  const redo = useCallback(async () => {
    setError(null);
    const annotationsSnapshot = annotationsRef.current;
    const historySnapshot = historyRef.current;
    const { history: next, effect } = redoHistory(historyRef.current);
    if (effect.op === "none") return;

    if (effect.op === "create") {
      // Redo of an undone create: re-create (server assigns a NEW _id).
      const source = effect.annotation;
      const saved = await rawCreate(createPayload(source));
      if (!saved) {
        setAnnotations(annotationsSnapshot);
        setHistory(historySnapshot);
        setTransientError("Failed to redo.");
        return;
      }
      setAnnotations((prev) => [...prev, saved]);
      // Re-point the moved entry to the new server _id (Req 7.2).
      setHistory(applyNewId(next, source._id, saved));
    } else {
      // Redo of an undone erase: remove the mark and DELETE it on the server.
      const target = effect.annotation;
      setAnnotations((prev) => prev.filter((a) => a._id !== target._id));
      const ok = await rawDelete(target._id);
      if (!ok) {
        setAnnotations(annotationsSnapshot);
        setHistory(historySnapshot);
        setTransientError("Failed to redo.");
        return;
      }
      setHistory(next);
    }
  }, [rawCreate, rawDelete, setTransientError]);

  const revertAll = useCallback(async () => {
    setError(null);
    const snapshot = annotationsRef.current;
    try {
      const res = await fetch(`/api/notes/${noteId}/annotations`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to clear annotations");
      setAnnotations([]);
      // Drop both undo/redo stacks on a successful revert (Req 8.3).
      setHistory(clearHistory());
    } catch {
      // Preserve the existing set on failure (Req 3.7).
      setAnnotations(snapshot);
      setError("Failed to revert annotations.");
    }
  }, [noteId]);

  return useMemo(
    () => ({
      annotations,
      byPage,
      loading,
      error,
      createHighlight,
      createScribble,
      deleteOne,
      revertAll,
      canUndo: history.undoStack.length > 0,
      canRedo: history.redoStack.length > 0,
      undo,
      redo,
    }),
    [
      annotations,
      byPage,
      loading,
      error,
      createHighlight,
      createScribble,
      deleteOne,
      revertAll,
      history,
      undo,
      redo,
    ]
  );
}
