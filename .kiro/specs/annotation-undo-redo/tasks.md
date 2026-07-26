# Implementation Plan: Annotation Undo/Redo

## Overview

Build per-action undo/redo for the PDF Viewer by first extracting a pure history
reducer (`lib/annotations/history.ts`), then wiring it into `useAnnotations`
around the existing optimistic persistence, and finally surfacing Undo/Redo
controls through `AnnotationToolbar` and `PDFPreviewModal`. Each task builds on
the previous one and ends with everything wired together. Implementation
language: **TypeScript** (matches existing code and design).

## Tasks

- [ ] 1. Create the pure undo/redo history module
  - [ ] 1.1 Implement `lib/annotations/history.ts`
    - Define `UndoableAction`, `History`, `Effect`, `Transition` types and `emptyHistory`
    - Implement `recordAction` (append to undoStack, clear redoStack), `undo`, `redo` (return `{ history, effect }`, no-op with `effect: none` on empty stack), `clearRedo`, `clear`, and `applyNewId` (re-point every entry referencing `oldId` to `newDto`)
    - Keep all functions total, immutable, and free of React/`fetch`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 7.2, 8.3_

  - [ ]* 1.2 Write property test for recording actions
    - **Property 1: Recording an action appends it to the undo stack in order**
    - **Validates: Requirements 1.1, 1.2, 1.4, 4.2**
    - Use fast-check, minimum 100 iterations; tag `// Feature: annotation-undo-redo, Property 1`

  - [ ]* 1.3 Write property test for redo-stack clearing on record
    - **Property 2: Recording a new action clears the redo stack**
    - **Validates: Requirements 4.1**
    - fast-check, >=100 iterations; tagged

  - [ ]* 1.4 Write property test for undo transition
    - **Property 3: Undo produces the correct effect and moves the top entry**
    - **Validates: Requirements 2.1, 2.2, 2.3**
    - fast-check, >=100 iterations; tagged

  - [ ]* 1.5 Write property test for redo transition
    - **Property 4: Redo produces the correct effect and moves the top entry**
    - **Validates: Requirements 3.1, 3.2, 3.3**
    - fast-check, >=100 iterations; tagged

  - [ ]* 1.6 Write property test for undo/redo round-trip
    - **Property 5: Undo and redo are inverse operations (round-trip)**
    - **Validates: Requirements 2.1, 2.2, 2.3, 3.1, 3.2, 3.3**
    - fast-check, >=100 iterations; tagged

  - [ ]* 1.7 Write property test for empty-stack no-ops
    - **Property 6: Undo and redo on an empty stack are no-ops**
    - **Validates: Requirements 2.4, 3.4**
    - fast-check, >=100 iterations; tagged

  - [ ]* 1.8 Write property test for id re-pointing
    - **Property 7: Applying a new id re-points every reference to the old id**
    - **Validates: Requirements 7.2**
    - fast-check, >=100 iterations; tagged

  - [ ]* 1.9 Write property test for mark-field preservation
    - **Property 8: A re-created mark preserves all mark fields**
    - **Validates: Requirements 1.3, 7.1**
    - fast-check, >=100 iterations; tagged

  - [ ]* 1.10 Write property test for clear
    - **Property 9: Clear empties both stacks**
    - **Validates: Requirements 1.5, 8.3**
    - fast-check, >=100 iterations; tagged

- [ ] 2. Wire history into the `useAnnotations` hook
  - [ ] 2.1 Add history state and refactor persistence
    - Add `history` state + `historyRef` (mirror the existing `annotationsRef` pattern) initialized to `emptyHistory`
    - Refactor `persist()` to return the reconciled server DTO (or `null` on rollback/failure)
    - Record a `create` action via `recordAction` only after `POST` resolves with a server DTO in `createHighlight`/`createScribble`
    - In `deleteOne`, resolve the DTO from `annotationsRef.current` before optimistic removal and record an `erase` action on delete success
    - _Requirements: 1.1, 1.2, 1.3, 4.1, 4.2, 8.1_

  - [ ] 2.2 Implement `undo()` / `redo()` and expose new API
    - Wire `undo()`/`redo()` around the pure module: snapshot state, call `undo`/`redo`, honor `effect: none`, apply optimistic mutation, persist `DELETE`/`POST`, call `applyNewId` to re-point after a re-creation, and roll back + set `error` on failure
    - Make `revertAll` call `clear()` on success to drop both stacks
    - Expose `canUndo`, `canRedo`, `undo`, `redo` from the hook
    - _Requirements: 2.1, 2.2, 2.3, 2.5, 3.1, 3.2, 3.3, 3.5, 6.1, 6.2, 6.3, 7.1, 7.2, 8.3_

  - [ ]* 2.3 Write integration tests for undo/redo persistence (mocked fetch)
    - Undo-create issues `DELETE`; undo-erase issues `POST` and re-points id; redo mirrors; rejected fetch restores annotations + both stacks and sets `error`; create records only after POST resolves
    - _Requirements: 2.1, 2.2, 2.5, 3.1, 3.2, 3.5, 6.1, 6.2, 6.3, 7.2, 8.1, 8.3_

- [ ] 3. Add Undo/Redo controls to the toolbar
  - [ ] 3.1 Extend `AnnotationToolbar`
    - Add `onUndo`, `onRedo`, `canUndo`, `canRedo` props
    - Add `Undo2` / `Redo2` lucide buttons next to Revert with `disabled` bound to `!canUndo` / `!canRedo`, `aria-label`s, and the existing `disabled:opacity-30` styling
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

  - [ ]* 3.2 Write component tests for toolbar controls
    - Both controls render; disabled states track `canUndo`/`canRedo`; enabled clicks call `onUndo`/`onRedo`; disabled controls do not invoke handlers
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

- [ ] 4. Wire controls through the modal
  - [ ] 4.1 Extend `PDFPreviewModal`
    - Pass `annotations.undo`, `annotations.redo`, `annotations.canUndo`, `annotations.canRedo` into `AnnotationToolbar`
    - _Requirements: 5.6, 5.7_

- [ ] 5. Final checkpoint
  - Run build/type-check; verify no regressions to existing create, erase, and Revert behavior. Ensure all tests pass, ask the user if questions arise.
  - _Requirements: 8.1, 8.2, 8.3_

## Notes

- Tasks marked with `*` are optional (tests) and can be skipped for a faster MVP.
- Property tests target only the pure `lib/annotations/history.ts` module; I/O
  paths use mocked example/integration tests.
- Each property test must run a minimum of 100 iterations with fast-check and be
  tagged `// Feature: annotation-undo-redo, Property {number}: {property_text}`.
- Checkpoints ensure incremental validation and preservation of existing tools.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "1.4", "1.5", "1.6", "1.7", "1.8", "1.9", "1.10", "2.1"] },
    { "id": 2, "tasks": ["2.2"] },
    { "id": 3, "tasks": ["2.3", "3.1"] },
    { "id": 4, "tasks": ["3.2", "4.1"] }
  ]
}
```
