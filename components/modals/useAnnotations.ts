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
 */

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { NormPoint, NormRect } from "@/lib/annotations/coordinates";
import type { PaletteColor } from "@/lib/annotations/validation";
import type { AnnotationDTO } from "@/lib/annotations/serialize";

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
}

let tempCounter = 0;
function tempId(): string {
  tempCounter += 1;
  return `temp-${Date.now()}-${tempCounter}`;
}

export function useAnnotations(noteId: string): UseAnnotations {
  const [annotations, setAnnotations] = useState<AnnotationDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Keep a ref to the latest annotations for optimistic reconciliation without
  // stale closures.
  const annotationsRef = useRef<AnnotationDTO[]>([]);
  annotationsRef.current = annotations;

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
    ): Promise<void> => {
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
      }
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
      await persist(optimistic, false);
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
      await persist(optimistic, true);
    },
    [noteId, persist]
  );

  const deleteOne = useCallback(
    async (annotationId: string) => {
      setError(null);
      const snapshot = annotationsRef.current;
      // Optimistic removal.
      setAnnotations((prev) => prev.filter((a) => a._id !== annotationId));
      try {
        const res = await fetch(
          `/api/notes/${noteId}/annotations/${annotationId}`,
          { method: "DELETE" }
        );
        if (!res.ok) throw new Error("Failed to delete annotation");
      } catch {
        // Restore on failure.
        setAnnotations(snapshot);
        setError("Failed to delete annotation.");
      }
    },
    [noteId]
  );

  const revertAll = useCallback(async () => {
    setError(null);
    const snapshot = annotationsRef.current;
    try {
      const res = await fetch(`/api/notes/${noteId}/annotations`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to clear annotations");
      setAnnotations([]);
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
    ]
  );
}
