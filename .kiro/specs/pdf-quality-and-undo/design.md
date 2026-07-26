# PDF Quality & Undo Bugfix Design

## Overview

This design fixes two independent, low-risk defects in the PDF viewer / annotation stack:

- **Fix 1 — Render quality (`components/modals/PDFDocument.tsx`).** The `<Page devicePixelRatio={...}>` expression caps rasterization at 2x (`Math.min(window.devicePixelRatio || 1, 2)`), which softens text on high-DPI phones (DPR ~2.5–3) and can drop below a 2x floor for `1 < DPR < 2`. The fix clamps the ratio to `[2, 3]` and uses an SSR fallback of `2`. Because `devicePixelRatio` only changes the canvas backing-store resolution — not the CSS layout width — fit-to-width sizing, zoom, `overlayScale`, and overlay alignment are unaffected.

- **Fix 2 — Resilient, idempotent undo/redo (`components/modals/useAnnotations.ts`).** `undo()`/`redo()` route their side effects through `rawDelete`/`rawCreate`. `rawDelete` currently returns `false` for any non-ok status (including `404`), for optimistic marks whose id still carries the `temp-` prefix (never persisted), and on a single transient network blip — each producing a spurious `"Failed to undo."`/`"Failed to redo."` rollback. The set error string then lingers indefinitely. The fix makes `rawDelete` idempotent (treat `404` as success), temp-id aware (skip the server call for `temp-` ids), and adds a single retry to both `rawDelete` and `rawCreate`; it also routes the transient undo/redo error strings through an auto-clearing helper so they no longer stick.

Both fixes are surgical and preserve all existing create / erase / redo / revert / history semantics.

## Glossary

- **Bug_Condition (C)**: The predicate identifying inputs that trigger a bug. For Fix 1, `isBugCondition_pdfQuality`; for Fix 2, `isBugCondition_undo` (see bugfix.md).
- **Property (P)**: The desired behavior for buggy inputs — DPR clamped to `[2, 3]`; undo/redo succeeds locally with no sticky error for already-absent / temp / transient cases.
- **Preservation**: Behavior for non-buggy inputs (`¬C(X)`) that must remain byte-for-byte identical: fit-to-width sizing, overlay alignment, optimistic create/persist/record, eraser `deleteOne`, redo, `revertAll`, `applyNewId`, history-stack semantics, per-page filtering.
- **F / F'**: The original (unfixed) function / the fixed function.
- **DPR**: `window.devicePixelRatio` — the ratio of physical device pixels to CSS pixels.
- **`rawDelete` / `rawCreate`**: History-agnostic persistence primitives in `useAnnotations.ts` that perform the raw DELETE / POST without recording history, used by `undo`/`redo`.
- **`temp-` id**: The `temp-<ts>-<n>` id assigned by `tempId()` to an optimistic annotation before the server returns a persisted `_id`.

## Bug Details

### Bug Condition

**Fix 1 — Render quality.** The bug manifests whenever the computed render ratio is below what a crisp `[2, 3]` clamp would produce — i.e. the current `Math.min(DPR, 2)` (or the SSR fallback `1`) is strictly less than `Math.min(Math.max(DPR, 2), 3)` (or SSR `2`).

**Formal Specification (from bugfix.md):**
```
FUNCTION isBugCondition_pdfQuality(X)
  INPUT: X = { devicePixelRatio: number | undefined }
  OUTPUT: boolean
  currentRatio  := (X.devicePixelRatio defined) ? min(X.devicePixelRatio, 2) : 1
  expectedRatio := (X.devicePixelRatio defined) ? min(max(X.devicePixelRatio, 2), 3) : 2
  RETURN currentRatio < expectedRatio
END FUNCTION
```

**Fix 2 — Undo/redo.** The bug manifests when an undo/redo delete effect targets an already-absent mark (`DELETE` returns `404`), targets an unsaved optimistic `temp-` mark, or hits a transient network failure that a single retry would clear.

**Formal Specification (from bugfix.md):**
```
FUNCTION isBugCondition_undo(X)
  INPUT: X = { op, targetId, deleteHttpStatus, networkTransientlyFails }
  OUTPUT: boolean
  isDeleteEffect := effectOf(X.op) = "delete"
  alreadyAbsent  := isDeleteEffect AND X.deleteHttpStatus = 404
  isTempMark     := isDeleteEffect AND startsWith(X.targetId, "temp-")
  transient      := X.networkTransientlyFails
  RETURN alreadyAbsent OR isTempMark OR transient
END FUNCTION
```

### Examples

**Fix 1:**
- DPR = 3 (high-DPI phone): current → `min(3,2)=2` (blurry); expected → `min(max(3,2),3)=3` (crisp). **Bug.**
- DPR = 2.625: current → `2`; expected → `2.625`. **Bug.**
- DPR = 1.5: current → `1.5`; expected → `min(max(1.5,2),3)=2`. **Bug** (below 2x floor).
- DPR = 2 (typical retina): current → `2`; expected → `2`. **Not a bug** (identity within clamp).
- SSR (`window` undefined): current → `1`; expected → `2`. **Bug.**

**Fix 2:**
- Undo a create whose annotation was already removed server-side → `DELETE` returns `404` → current sets `"Failed to undo."`; expected: treated as success, no error. **Bug.**
- Undo a delete effect on a `temp-172...-3` mark → current issues `DELETE /.../temp-172...-3` (server can't satisfy) → error; expected: remove locally, no server call. **Bug.**
- Undo during a transient network drop → current returns `false` on first failure → rollback + error; expected: retry once, then succeed. **Bug.**
- Undo a create with a real `_id`, server returns `200` → succeeds. **Not a bug.**
- Undo whose `DELETE` returns a genuine `500` on both attempts → hard failure, rollback + brief (auto-clearing) error. **Not a bug** (genuine failure path preserved).

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors (Fix 1):**
- Fit-to-width sizing (`fitWidth`, `pageWidth`) and `scale`/zoom behavior.
- `overlayScale` computation and annotation alignment across zoom.
- Range-only loading (`disableAutoFetch`, `disableStream`, `rangeChunkSize`), `renderTextLayer`, `renderAnnotationLayer`, and the `onPageDimensions`/`onRenderSuccess` callbacks.

**Unchanged Behaviors (Fix 2):**
- Optimistic create → `persist` → `recordAction` flow; highlight rollback-on-failure; scribble retain-on-failure.
- Eraser `deleteOne` (optimistic removal, restore-on-failure, erase history recording).
- `redo`, `revertAll` (drop both stacks on success, preserve local set on failure).
- `applyNewId` re-pointing after re-create, undo/redo stack semantics, redo-stack-cleared-on-new-action, per-page `byPage` filtering.
- The malformed-DTO guard in `rawCreate`, and genuine hard-failure rollback of annotations + history snapshot.

**Scope:** Any input where `isBugCondition_*` is false must behave identically to the original. For Fix 1 that means all DPR values already within `[2, 3]` (and all non-ratio render behavior); for Fix 2, all successful undo/redo, creates, erases, redo, revert-all, and genuine non-`404`/non-transient failures.

## Hypothesized Root Cause

**Fix 1:**
1. **Over-aggressive performance clamp.** A prior memory optimization replaced the original `Math.max(DPR, 2)` intent with `Math.min(DPR || 1, 2)`, capping backing resolution at 2x and removing the crispness floor for sub-2 ratios. The SSR branch fell back to `1` rather than the intended `2`.

**Fix 2:**
1. **Non-idempotent delete.** `rawDelete` treats every non-ok response as failure; a `404` (mark already gone) is really a satisfied post-condition, not an error.
2. **Temp-id deletes.** Optimistic marks whose POST never persisted still carry `temp-` ids; issuing a `DELETE` for them can never succeed, yet the effect (mark removed locally) is already achievable.
3. **No retry on transient errors.** A single `fetch` rejection immediately returns `false`/`null`, so a momentary network blip forces a rollback.
4. **Sticky error state.** `error` is only reset at the start of the next action, so a transient `"Failed to undo."` lingers on screen indefinitely.

## Correctness Properties

Property 1: Bug Condition — Render DPR clamp within `[2, 3]`

_For any_ input where the bug condition holds (`isBugCondition_pdfQuality` returns true), the fixed `PDFDocument` render ratio SHALL equal `Math.min(Math.max(window.devicePixelRatio || 1, 2), 3)` when `window` is defined, and `2` under SSR — i.e. always within `[2, 3]`, restoring crisp rendering (up to 3x) while capping memory.

**Validates: Requirements 2.1, 2.2**

Property 2: Bug Condition — Resilient, idempotent undo/redo

_For any_ input where the bug condition holds (`isBugCondition_undo` returns true), the fixed `undo()`/`redo()` SHALL succeed with the mark removed locally and no persistent error, such that: a `temp-` target skips the server `DELETE`; a `404` is treated as success (idempotent); and a transient failure is retried exactly once before any rollback. Any residual undo/redo error string auto-clears.

**Validates: Requirements 2.3, 2.4, 2.5, 2.6**

Property 3: Preservation — Render sizing & non-ratio behavior unchanged

_For any_ input where the bug condition does NOT hold (`isBugCondition_pdfQuality` returns false, i.e. DPR already within `[2, 3]`), the fixed function SHALL produce the same result as the original function, preserving fit-to-width sizing, `overlayScale`, overlay alignment, range loading, and all render callbacks (`devicePixelRatio` changes only the canvas backing resolution, never CSS size).

**Validates: Requirements 3.1, 3.2**

Property 4: Preservation — Create/erase/redo/revert/history unchanged

_For any_ input where the bug condition does NOT hold (`isBugCondition_undo` returns false — successful undo/redo, creates, erases, redo, revert-all, or genuine non-`404`/non-transient failures), the fixed function SHALL produce the same result as the original function, preserving the optimistic create/persist/record flow, eraser `deleteOne`, redo, `revertAll` stack-clearing, `applyNewId` re-pointing, history-stack semantics, per-page filtering, and genuine hard-failure rollback.

**Validates: Requirements 3.3, 3.4, 3.5, 3.6, 3.7, 3.8**

## Fix Implementation

### Fix 1 — `components/modals/PDFDocument.tsx`

**Component:** `PDFDocument` → the `<Page>` element.

**Exact change** — replace the `devicePixelRatio` expression:

```tsx
// BEFORE
devicePixelRatio={
  typeof window !== "undefined"
    ? Math.min(window.devicePixelRatio || 1, 2)
    : 1
}

// AFTER
devicePixelRatio={
  typeof window !== "undefined"
    ? Math.min(Math.max(window.devicePixelRatio || 1, 2), 3)
    : 2
}
```

- `Math.max(window.devicePixelRatio || 1, 2)` establishes a 2x floor (and handles `0`/`NaN`/`undefined` via the `|| 1` → then floored to `2`).
- `Math.min(..., 3)` caps backing resolution at 3x to bound canvas memory.
- SSR fallback changes from `1` to `2` (lower bound of the clamp).
- No other prop (`width`, `scale`, `overlayScale`, layers, callbacks) changes.

### Fix 2 — `components/modals/useAnnotations.ts`

**1. Auto-clearing error helper (new internal).** Add a `useRef` to hold a pending timeout id and a helper that sets the error then schedules a clear after ~4s; it clears any prior timeout first, and a cleanup effect clears the timeout on unmount.

```ts
const errorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

// Sets a transient error that auto-clears after ~4s (undo/redo/deleteOne).
const setTransientError = useCallback((message: string) => {
  setError(message);
  if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
  errorTimeoutRef.current = setTimeout(() => {
    setError(null);
    errorTimeoutRef.current = null;
  }, 4000);
}, []);

// Clear any pending timeout on unmount.
useEffect(() => {
  return () => {
    if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
  };
}, []);
```

**2. `rawDelete` — temp-aware, idempotent, single retry:**

```ts
const rawDelete = useCallback(
  async (annotationId: string): Promise<boolean> => {
    // (a) temp- ids were never persisted; nothing to delete on the server.
    if (annotationId.startsWith("temp-")) return true;

    const attempt = async (): Promise<boolean> => {
      const res = await fetch(
        `/api/notes/${noteId}/annotations/${annotationId}`,
        { method: "DELETE" }
      );
      // (b) idempotent: ok OR already-absent (404) both mean "gone".
      if (res.ok || res.status === 404) return true;
      throw new Error("Failed to delete annotation");
    };

    try {
      return await attempt();
    } catch {
      // (c) retry exactly once after a short delay on a thrown/network error.
      try {
        await new Promise((r) => setTimeout(r, 300));
        return await attempt();
      } catch {
        return false;
      }
    }
  },
  [noteId]
);
```

Note: a non-ok, non-`404` status (e.g. `500`) throws inside `attempt`, so it is retried once and then reported as a genuine failure — preserving the hard-failure rollback path.

**3. `rawCreate` — single retry, keep malformed-DTO guard:**

```ts
const rawCreate = useCallback(
  async (payload: ReturnType<typeof createPayload>): Promise<AnnotationDTO | null> => {
    const attempt = async (): Promise<AnnotationDTO> => {
      const res = await fetch(`/api/notes/${noteId}/annotations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save annotation");
      const saved: AnnotationDTO = data.annotation;
      if (!saved || !saved._id) throw new Error("Malformed annotation"); // guard preserved
      return saved;
    };
    try {
      return await attempt();
    } catch {
      try {
        await new Promise((r) => setTimeout(r, 300));
        return await attempt();
      } catch {
        return null;
      }
    }
  },
  [noteId]
);
```

**4. Route undo/redo transient errors through the auto-clearing helper.** In `undo()` and `redo()`, the genuine-failure branches change `setError("Failed to undo.")` / `setError("Failed to redo.")` to `setTransientError("Failed to undo.")` / `setTransientError("Failed to redo.")`. Optionally `deleteOne`'s `"Failed to delete annotation."` may also use `setTransientError` (transient erase failure). The persistent create/load errors (`"Failed to save annotation."`, `"Failed to save highlight."`, `"Failed to load annotations."`, `"Failed to revert annotations."`) remain plain `setError` and do NOT auto-clear.

Because `rawDelete` is now idempotent + temp-aware and both primitives retry once, the delete/create paths in `undo()`/`redo()` (which already remove/add locally first) will no longer reach the rollback branch for `404` / `temp-` / single-transient cases — the snapshot-restore + error is retained only for genuine, non-recoverable failures.

**Unchanged:** `persist` (optimistic create), `createHighlight`/`createScribble` record flow, `deleteOne` optimistic-remove/restore/record, `redo` structure, `revertAll` stack-clearing, `applyNewId` re-pointing, history semantics, `byPage` filtering.

## Edge Cases

- **`window.devicePixelRatio` is `0` or `undefined`:** `0 || 1 → 1`, then `Math.max(1, 2) → 2`, `Math.min(2, 3) → 2`. Yields the 2x floor rather than a degenerate `0`/`1`. (`undefined` behaves the same via `|| 1`.)
- **DPR extremely high (e.g. 4):** `Math.min(Math.max(4, 2), 3) → 3` — capped, bounding canvas memory.
- **`404` vs `500` on delete:** `404` → success (idempotent, no error); `500` → thrown → retried once → if still failing, genuine failure with rollback + auto-clearing error.
- **Multiple rapid undos with overlapping timeouts:** each transient error calls `setTransientError`, which clears the previous timeout before scheduling a new one, so only the latest 4s timer is active — no premature clear and no leaked timers.
- **Unmount during a pending timeout:** the cleanup effect clears `errorTimeoutRef.current`, preventing a `setError` on an unmounted component.
- **Unmount / rapid re-invoke during the 300ms retry delay:** the retry only calls `setState` via the calling `undo`/`redo` (React tolerates no-op updates on unmounted components in current versions); the primitives themselves hold no state, so a stranded retry resolves to a boolean/null harmlessly.
- **Mixed temp + real ids in one undo chain:** each `rawDelete` decision is per-id, so a `temp-` mark short-circuits while a real id still round-trips to the server.

## Testing / Verification Strategy

### Validation Approach

Two phases: first surface counterexamples on the UNFIXED code, then verify the fix corrects the bug condition and preserves everything else. Given both fixes are small and UI/network-bound, verification is primarily code inspection plus targeted manual checks (no heavy automated harness required).

### Exploratory Bug Condition Checking

**Goal:** Confirm the counterexamples from bugfix.md exist on unfixed code.

- **Fix 1:** Inspect the rendered `<canvas>` backing resolution on a high-DPI device (DPR ≈ 3) or via DevTools device emulation — observe the canvas rasterized at 2x (soft text). Confirms Property 1's bug condition.
- **Fix 2:** With the network throttled/offline (or a mark deleted out-of-band so `DELETE` returns `404`), perform an undo of a create — observe `"Failed to undo."` and the state rollback. Undo a create whose optimistic mark still has a `temp-` id (trigger by undoing immediately after a create on a slow connection) — observe the spurious error. Confirms Property 2's bug condition.

### Fix Checking

```
FOR ALL X WHERE isBugCondition_pdfQuality(X) DO
  ASSERT renderDevicePixelRatio'(X) = (X.dpr defined ? min(max(X.dpr,2),3) : 2)   // in [2,3]
END FOR

FOR ALL X WHERE isBugCondition_undo(X) DO
  result := undoOrRedo'(X)
  ASSERT result.succeeded AND result.markRemovedLocally
     AND (isTempMark(X)    => NOT result.serverDeleteCalled)
     AND (alreadyAbsent(X) => result.treatedAsSuccess)
     AND (transient(X)     => result.retriedOnce)
     AND NOT result.persistentError
END FOR
```

**Manual checks:**
- Crisp text: reload a PDF on a DPR≈3 device — text/lines render sharp (matching a 3x canvas).
- Undo on slow net: throttle the network, create then undo a mark — no error banner appears; mark is removed.
- Already-absent: delete a mark server-side, then undo its create — no error.
- Auto-clear: force a genuine undo failure — the `"Failed to undo."` banner disappears after ~4s.

### Preservation Checking

```
FOR ALL X WHERE NOT isBugCondition_pdfQuality(X) DO
  ASSERT renderDevicePixelRatio'(X) within [2,3]
     AND fitToWidth(X) = fitToWidth'(X) AND overlayScale(X) = overlayScale'(X)
END FOR

FOR ALL X WHERE NOT isBugCondition_undo(X) DO
  ASSERT undoOrRedo(X) = undoOrRedo'(X)
END FOR
```

**Manual/inspection checks:**
- DPR = 2 device: rendering, zoom, fit-to-width, and overlay alignment identical to before.
- Create highlight/scribble (success + failure), eraser delete (success + restore-on-failure), redo, revert-all, and an undo/redo re-create (`applyNewId`) all behave as before.
- Genuine `500` on undo delete (both attempts) still rolls back state and shows the (now auto-clearing) error.

### Unit / Property-Based / Integration (if formalized later)

- **Unit:** `rawDelete` returns `true` for `temp-` ids without fetch; `true` on `404`; retries once then `false` on repeated throw. `rawCreate` retries once then `null`; malformed DTO → `null`. DPR clamp helper maps sample DPR values into `[2, 3]`.
- **Property-based:** for random DPR in `(0, 5)`, clamp result ∈ `[2, 3]` and equals `min(max(dpr,2),3)`; for random non-`404`/non-transient undo inputs, fixed output equals original.
- **Integration:** full annotate → undo → redo flow under normal and throttled network; verify no sticky error and correct final annotation set.

_This design references the bug-condition properties defined in `bugfix.md` (`isBugCondition_pdfQuality`, `isBugCondition_undo`) and their fix/preservation properties._
