# Bugfix Requirements Document

## Introduction

This bugfix addresses two independent defects in the PDF viewer / annotation stack of Note-Sphere:

- **Bug 1 — Reduced PDF render quality.** `components/modals/PDFDocument.tsx` renders the `<Page>` with `devicePixelRatio={Math.min(window.devicePixelRatio || 1, 2)}`. A prior performance change lowered this from the original `Math.max(window.devicePixelRatio, 2)`, so on high-DPI phones (where `window.devicePixelRatio` is ~2.5–3) the canvas is rasterized at only 2x instead of ~3x. Text and lines appear blurry/soft on those devices.

- **Bug 2 — Spurious "Failed to undo" error.** In `components/modals/useAnnotations.ts`, `undo()`/`redo()` call the history-agnostic helpers `rawDelete`/`rawCreate`. `rawDelete` returns `false` for *any* non-ok HTTP response (including `404`). When a mark is already absent server-side (already deleted), when the undo targets an optimistic mark whose id still has the temporary `temp-` prefix (its POST never resolved / was never stored), or when the connection is transiently flaky, `rawDelete` returns `false`, `undo()` rolls back the local state and sets `error = "Failed to undo."` The error is spurious (the user's intent — remove the mark — is already or trivially satisfiable) and the error string persists on screen indefinitely.

Both defects are targeted, low-risk fixes. The methodology below defines, for each bug, the **bug condition** `C(X)` that identifies triggering inputs, the **current (defective) behavior**, the **expected (correct) behavior**, and the **unchanged behavior** that must be preserved (regression prevention).

## Bug Analysis

### Current Behavior (Defect)

**Bug 1 — PDF render quality**

1.1 WHEN a PDF page is rendered on a device where `window.devicePixelRatio` is greater than 2 (e.g. high-DPI phones at ~2.5–3) THEN the `<Page>` in `PDFDocument.tsx` rasterizes the canvas at a `devicePixelRatio` of only 2 (because of `Math.min(window.devicePixelRatio || 1, 2)`), producing visibly blurry/soft text and lines.

1.2 WHEN `window.devicePixelRatio` is between 1 and 2 (inclusive) THEN the page renders at that raw ratio, which can be below the 2x floor needed for crisp text on some displays.

**Bug 2 — "Failed to undo" / "Failed to redo"**

1.3 WHEN a user undoes a create whose annotation was deleted server-side already (the `DELETE` returns HTTP `404`) THEN `rawDelete` returns `false`, `undo()` restores the prior annotations/history snapshot and sets `error = "Failed to undo."`, even though the mark is already gone.

1.4 WHEN a user undoes/redoes a delete that targets an optimistic mark whose `_id` still carries the temporary `temp-` prefix (the create's POST never resolved or was never stored) THEN the code issues a `DELETE /api/notes/{noteId}/annotations/temp-...` that the server cannot satisfy, `rawDelete` returns `false`, and a spurious "Failed to undo." / "Failed to redo." error is shown.

1.5 WHEN the network fails transiently during an undo/redo `rawDelete` or `rawCreate` call THEN the single failed attempt immediately returns `false`/`null` with no retry, causing a spurious failure and rollback.

1.6 WHEN an undo/redo error is set THEN the `error` string persists on screen indefinitely (it is only cleared at the start of the next undo/redo/create/delete/revert), so a transient failure leaves a lingering, sticky error message.

### Expected Behavior (Correct)

**Bug 1 — PDF render quality**

2.1 WHEN a PDF page is rendered THEN `PDFDocument.tsx` SHALL compute the render device pixel ratio as `Math.min(Math.max(window.devicePixelRatio || 1, 2), 3)`, clamping it to the range `[2, 3]`, so high-DPI devices render crisply (up to 3x) while keeping a memory cap at 3x.

2.2 WHEN the code runs during server-side rendering (`window` is undefined) THEN `PDFDocument.tsx` SHALL fall back to a device pixel ratio of `2` (SSR-safe), matching the lower bound of the clamp rather than `1`.

**Bug 2 — "Failed to undo" / "Failed to redo"**

2.3 WHEN an undo/redo delete receives HTTP `404` (the annotation is already absent) THEN `rawDelete` SHALL treat it as success (return `true`), because the post-condition "mark is gone" already holds, and no error SHALL be shown.

2.4 WHEN an undo/redo delete targets an annotation whose `_id` has the temporary `temp-` prefix THEN the operation SHALL remove the mark locally without issuing a server `DELETE` call, and SHALL succeed without error.

2.5 WHEN a `rawDelete` or `rawCreate` call fails due to a transient network error THEN the helper SHALL retry the request exactly once before reporting failure.

2.6 WHEN an undo/redo error indication is shown THEN it SHALL auto-clear after a few seconds (or be cleared on the next successful action) so that it does not linger on screen.

2.7 WHEN an undo/redo operation fails only after exhausting the idempotency, temp-id, and single-retry handling above (a genuine, non-recoverable failure) THEN the system MAY show a brief error and SHALL restore the prior annotations/history state.

### Unchanged Behavior (Regression Prevention)

**Bug 1 preservation**

3.1 WHEN a PDF page is rendered on a device where `window.devicePixelRatio` is already between 2 and 3 THEN the system SHALL CONTINUE TO render at that ratio (the clamp is an identity within `[2, 3]`), and fit-to-width sizing, zoom, `pageWidth`/`overlayScale` computation, and annotation alignment across zoom SHALL CONTINUE TO behave exactly as before.

3.2 WHEN rendering a page THEN range-only loading (`disableAutoFetch`, `disableStream`, `rangeChunkSize`), per-page filtering, `renderTextLayer`/`renderAnnotationLayer`, and the `onPageDimensions`/`onRenderSuccess` callbacks SHALL CONTINUE TO work unchanged.

**Bug 2 preservation**

3.3 WHEN a user creates a highlight or scribble THEN the optimistic-render, POST-then-record flow (`persist`, `recordAction`), highlight rollback-on-failure, and scribble retain-on-failure semantics SHALL CONTINUE TO work unchanged.

3.4 WHEN a user erases an annotation via the eraser (`deleteOne`) THEN optimistic removal, restore-on-failure, and history recording of the erase SHALL CONTINUE TO work unchanged.

3.5 WHEN a user performs redo, or revert-all (`revertAll`) THEN those operations SHALL CONTINUE TO behave as before, including dropping both stacks on successful revert and preserving the local set on revert failure.

3.6 WHEN an undo/redo re-creates a mark (server assigns a new `_id`) THEN the id re-pointing via `applyNewId` SHALL CONTINUE TO update the moved history entry correctly.

3.7 WHEN a user performs any sequence of actions THEN the undo/redo history semantics SHALL CONTINUE TO be unchanged: the undo/redo stacks, and the rule that a new action clears the redo stack (`recordAction`), remain exactly as before.

3.8 WHEN an undo/redo delete or create receives a genuine, non-`404`, non-transient server error THEN the system SHALL CONTINUE TO restore the prior state (rollback of annotations and history snapshot).

## Bug Condition Methodology

The following pseudocode formalizes the triggering inputs (`isBugCondition`), the fix-checking property (correct behavior for buggy inputs), and the preservation-checking property (unchanged behavior for non-buggy inputs) for each bug. Here `F` is the original (unfixed) function and `F'` is the fixed function.

### Bug 1 — PDF render quality

```pascal
FUNCTION isBugCondition_pdfQuality(X)
  INPUT:  X = { devicePixelRatio: number | undefined }   // window.devicePixelRatio (undefined under SSR)
  OUTPUT: boolean

  // The bug manifests whenever the computed render ratio is below what a
  // crisp [2, 3] clamp would produce.
  currentRatio  := (X.devicePixelRatio is defined)
                     ? min(X.devicePixelRatio, 2)
                     : 1
  expectedRatio := (X.devicePixelRatio is defined)
                     ? min(max(X.devicePixelRatio, 2), 3)
                     : 2

  RETURN currentRatio < expectedRatio
END FUNCTION
```

```pascal
// Property: Fix Checking (Bug 1) — validates 2.1, 2.2
FOR ALL X WHERE isBugCondition_pdfQuality(X) DO
  ratio := renderDevicePixelRatio'(X)        // F' = PDFDocument render ratio
  ASSERT ratio = (X.devicePixelRatio is defined
                    ? min(max(X.devicePixelRatio, 2), 3)
                    : 2)
END FOR
```

```pascal
// Property: Preservation Checking (Bug 1) — validates 3.1, 3.2
FOR ALL X WHERE NOT isBugCondition_pdfQuality(X) DO
  // For ratios already within [2, 3], the clamp is an identity vs. the intent,
  // and all non-ratio render behavior is untouched.
  ASSERT renderDevicePixelRatio(X) is within [2, 3]
     AND fitToWidth(X) = fitToWidth'(X)
     AND overlayScale(X) = overlayScale'(X)
END FOR
```

### Bug 2 — "Failed to undo" / "Failed to redo"

```pascal
FUNCTION isBugCondition_undo(X)
  INPUT:  X = {
            op: "undo" | "redo",
            targetId: string,           // _id of the annotation the effect deletes
            deleteHttpStatus: number,   // status the DELETE would return (e.g. 404, 503)
            networkTransientlyFails: boolean
          }
  OUTPUT: boolean

  isDeleteEffect := effectOf(X.op) = "delete"

  // Case A: server says the mark is already absent.
  alreadyAbsent  := isDeleteEffect AND X.deleteHttpStatus = 404
  // Case B: the target is an unsaved optimistic mark.
  isTempMark     := isDeleteEffect AND startsWith(X.targetId, "temp-")
  // Case C: a transient network failure that a single retry would clear.
  transient      := X.networkTransientlyFails

  RETURN alreadyAbsent OR isTempMark OR transient
END FUNCTION
```

```pascal
// Property: Fix Checking (Bug 2) — validates 2.3, 2.4, 2.5, 2.6
FOR ALL X WHERE isBugCondition_undo(X) DO
  result := undoOrRedo'(X)          // F' = fixed undo()/redo()

  // The user's intent is satisfied and NO sticky error remains.
  ASSERT result.succeeded = true
     AND result.markRemovedLocally = true
     AND (isTempMark(X)     IMPLIES result.serverDeleteCalled = false)
     AND (alreadyAbsent(X)  IMPLIES result.treatedAsSuccess   = true)
     AND (transient(X)      IMPLIES result.retriedOnce        = true)
     AND result.persistentError = false      // any residual error auto-clears
END FOR
```

```pascal
// Property: Preservation Checking (Bug 2) — validates 3.3–3.8
FOR ALL X WHERE NOT isBugCondition_undo(X) DO
  // Non-triggering inputs: successful undo/redo, creates, erases, redo,
  // revert-all, applyNewId re-pointing, and genuine hard failures all behave
  // identically to the original implementation.
  ASSERT undoOrRedo(X) = undoOrRedo'(X)
END FOR
```
