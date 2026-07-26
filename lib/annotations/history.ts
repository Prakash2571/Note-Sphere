/**
 * lib/annotations/history.ts
 *
 * Pure undo/redo state machine for PDF annotations. This module owns the
 * per-action history (two stacks) and the transition rules between them. It is
 * the property-tested core of the annotation-undo-redo feature: no React, no
 * `fetch`, no clock access. Every function is total and immutable — inputs are
 * never mutated and a fresh `History` (and, where relevant, an `Effect`
 * descriptor) is returned.
 *
 * The wiring layer (`useAnnotations`) performs the I/O described by each
 * returned `Effect` and reconciles server-assigned `_id`s back into the stacks
 * via `applyNewId`.
 */

import type { AnnotationDTO } from "./serialize";

/**
 * A single reversible annotation operation. The `annotation` field always holds
 * the CURRENT server DTO for the mark (its `_id` may be rewritten by
 * `applyNewId` after a re-creation assigns a new id).
 */
export type UndoableAction =
  | { kind: "create"; annotation: AnnotationDTO }
  | { kind: "erase"; annotation: AnnotationDTO };

/** Immutable undo/redo state. Top of each stack is the LAST element. */
export interface History {
  undoStack: UndoableAction[];
  redoStack: UndoableAction[];
}

/** Side effect the wiring layer must perform to realize a transition. */
export type Effect =
  | { op: "delete"; annotation: AnnotationDTO } // remove this mark via DELETE
  | { op: "create"; annotation: AnnotationDTO } // re-create this mark via POST
  | { op: "none" }; // empty-stack no-op

/** Result of a pure transition: the next history plus the effect to run. */
export interface Transition {
  history: History;
  effect: Effect;
}

/** The initial (empty) history value. */
export const emptyHistory: History = { undoStack: [], redoStack: [] };

/**
 * Req 1.1-1.4, Req 4: record a freshly performed user action.
 * Appends the action to the top of `undoStack` and clears `redoStack`.
 * Returns a new History; inputs are not mutated.
 */
export function recordAction(h: History, action: UndoableAction): History {
  return {
    undoStack: [...h.undoStack, action],
    redoStack: [],
  };
}

/**
 * Req 2: compute the undo transition (does NOT run I/O).
 * - create at top  -> effect delete(annotation); move entry to redoStack
 * - erase  at top  -> effect create(annotation); move entry to redoStack
 * - empty          -> effect none; history unchanged (Req 2.4)
 */
export function undo(h: History): Transition {
  if (h.undoStack.length === 0) {
    return { history: h, effect: { op: "none" } };
  }

  const top = h.undoStack[h.undoStack.length - 1];
  const effect: Effect =
    top.kind === "create"
      ? { op: "delete", annotation: top.annotation }
      : { op: "create", annotation: top.annotation };

  const next: History = {
    undoStack: h.undoStack.slice(0, -1),
    redoStack: [...h.redoStack, top],
  };

  return { history: next, effect };
}

/**
 * Req 3: compute the redo transition (does NOT run I/O).
 * - create at top of redo -> effect create(annotation); move to undoStack
 * - erase  at top of redo -> effect delete(annotation); move to undoStack
 * - empty                 -> effect none; history unchanged (Req 3.4)
 */
export function redo(h: History): Transition {
  if (h.redoStack.length === 0) {
    return { history: h, effect: { op: "none" } };
  }

  const top = h.redoStack[h.redoStack.length - 1];
  const effect: Effect =
    top.kind === "create"
      ? { op: "create", annotation: top.annotation }
      : { op: "delete", annotation: top.annotation };

  const next: History = {
    undoStack: [...h.undoStack, top],
    redoStack: h.redoStack.slice(0, -1),
  };

  return { history: next, effect };
}

/** Req 4.1: clear only the redo stack. Returns a new History. */
export function clearRedo(h: History): History {
  return {
    undoStack: h.undoStack,
    redoStack: [],
  };
}

/** Req 1.5 / Req 8.3: clear both stacks (session end, revert). */
export function clear(): History {
  return { undoStack: [], redoStack: [] };
}

/**
 * Req 7.2: after a re-creation assigns a NEW server `_id`, rewrite every
 * `UndoableAction` on either stack whose `annotation._id === oldId` so it
 * references `newDto`. Non-matching entries are returned unchanged. This is the
 * single place that implements the `_id` re-pointing rule, so later operations
 * target the correct mark. Returns a new History; inputs are not mutated.
 */
export function applyNewId(
  h: History,
  oldId: string,
  newDto: AnnotationDTO
): History {
  const rewrite = (action: UndoableAction): UndoableAction =>
    action.annotation._id === oldId
      ? { ...action, annotation: newDto }
      : action;

  return {
    undoStack: h.undoStack.map(rewrite),
    redoStack: h.redoStack.map(rewrite),
  };
}
