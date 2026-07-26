# Implementation Plan

> Two independent fixes: **Fix 1** = PDF render quality (`PDFDocument.tsx`), **Fix 2** = resilient/idempotent undo-redo (`useAnnotations.ts`). Write exploration tests BEFORE the fix and run them on UNFIXED code to confirm the bug.

- [ ] 1. Write bug-condition exploration tests (BEFORE any fix)
  - **Property 1: Bug Condition** - Render DPR clamp within `[2, 3]`
  - **Property 2: Bug Condition** - Resilient, idempotent undo/redo
  - **CRITICAL**: These MUST FAIL on unfixed code — failure confirms the bugs exist. Do NOT fix code/tests when they fail.
  - **GOAL**: Surface counterexamples from design.md.
  - **Scoped PBT approach** (deterministic bugs → concrete failing cases):
    - Fix 1: assert the render DPR expression yields a value in `[2,3]` for DPR=3 (expect 3, unfixed gives 2), DPR=1.5 (expect 2, unfixed gives 1.5), and SSR (expect 2, unfixed gives 1). Ref `isBugCondition_pdfQuality`.
    - Fix 2: assert `rawDelete` succeeds for a `404` response, for a `temp-` id (no server call), and after one transient network throw; assert undo() sets no persistent error. Ref `isBugCondition_undo`.
  - Run on UNFIXED code; **EXPECTED OUTCOME**: tests FAIL. Document counterexamples.
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [ ] 2. Write preservation property tests (BEFORE any fix)
  - **Property 3: Preservation** - Render sizing & non-ratio behavior unchanged
  - **Property 4: Preservation** - Create/erase/redo/revert/history unchanged
  - **IMPORTANT**: Observation-first — observe behavior on UNFIXED code, then encode it.
    - Fix 1: DPR already in `[2,3]` renders at that ratio; fit-to-width, `overlayScale`, overlay alignment, range loading, and render callbacks unchanged.
    - Fix 2: successful undo/redo, optimistic create/persist/record, eraser `deleteOne`, redo, `revertAll` stack-clearing, `applyNewId` re-pointing, `byPage` filtering, and genuine (non-`404`/non-transient) failure rollback unchanged.
  - Run on UNFIXED code; **EXPECTED OUTCOME**: tests PASS (baseline to preserve).
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

- [ ] 3. Fix 1 — PDF render quality (`components/modals/PDFDocument.tsx`)
  - On the `<Page>`, change `devicePixelRatio` to `typeof window !== "undefined" ? Math.min(Math.max(window.devicePixelRatio || 1, 2), 3) : 2` (clamp to `[2,3]`, SSR fallback `2`).
  - Change no other prop (`width`, `scale`, `overlayScale`, layers, callbacks).
  - _Bug_Condition: isBugCondition_pdfQuality(X) from design_
  - _Expected_Behavior: render ratio = min(max(DPR||1,2),3), SSR=2 (Property 1)_
  - _Preservation: Preservation Requirements Fix 1 (Property 3)_
  - _Requirements: 2.1, 2.2_

- [ ] 4. Fix 2 — Resilient, idempotent undo/redo (`components/modals/useAnnotations.ts`)

  - [ ] 4.1 Make `rawDelete` temp-aware, idempotent, single-retry
    - (a) if `annotationId` starts with `"temp-"` return `true` without a server call;
    - (b) treat `res.ok` OR `res.status === 404` as success;
    - (c) on a thrown/network error, retry the request exactly once (short delay) before returning `false` (preserves genuine hard-failure rollback for non-`404`/`500`).
    - _Bug_Condition: isBugCondition_undo(X) — alreadyAbsent / isTempMark / transient_
    - _Requirements: 2.3, 2.4, 2.5_

  - [ ] 4.2 Add single-retry to `rawCreate`
    - Retry the POST exactly once on a thrown/network error before returning `null`; keep the malformed-DTO guard (`!saved || !saved._id`).
    - _Requirements: 2.5_

  - [ ] 4.3 Add auto-clearing transient-error helper and route undo/redo errors through it
    - Add `errorTimeoutRef` + `setTransientError(msg)` that sets the error, clears any prior timeout, and auto-clears after ~4s; add an unmount cleanup effect.
    - Route `"Failed to undo."` / `"Failed to redo."` through `setTransientError`; keep create/load/revert errors as plain `setError` (persistent).
    - _Expected_Behavior: no persistent error, mark removed locally (Property 2)_
    - _Preservation: create/erase/redo/revert/history unchanged (Property 4)_
    - _Requirements: 2.6, 2.7_

  - [ ] 4.4 Verify exploration tests now pass
    - **Property 1: Expected Behavior** - Render DPR clamp within `[2, 3]`
    - **Property 2: Expected Behavior** - Resilient, idempotent undo/redo
    - Re-run the SAME tests from task 1 (do NOT write new ones). **EXPECTED OUTCOME**: PASS.
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [ ] 4.5 Verify preservation tests still pass
    - **Property 3: Preservation** - Render sizing & non-ratio behavior unchanged
    - **Property 4: Preservation** - Create/erase/redo/revert/history unchanged
    - Re-run the SAME tests from task 2 (do NOT write new ones). **EXPECTED OUTCOME**: PASS (no regressions).
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

- [ ] 5. Optional* verification (design notes verification is primarily inspection + targeted manual checks)
  - DPR clamp result ∈ `[2,3]` for sample/random DPR; delete idempotent on `404`; `temp-` id triggers no server call; retry-once on transient throw; undo/redo error auto-clears (~4s).
  - Preservation spot-checks: create/erase/redo/revert/`applyNewId`/history/zoom/fit-to-width/range-loading behave as before.
  - _Requirements: 2.1-2.7, 3.1-3.8_

- [ ] 6. Checkpoint — Ensure all tests pass
  - Run build / type-check. Manual: crisp text on DPR≈3 device; undo works with no error banner on slow/offline net; forced genuine failure banner clears after ~4s.
  - Confirm all tests pass; ask the user if questions arise.

## Task Dependency Graph

```
Task 1 (exploration tests — must FAIL on unfixed code)
Task 2 (preservation tests — must PASS on unfixed code)
        │
        ▼
Task 3 (Fix 1: PDFDocument DPR clamp)  ── independent ──┐
Task 4 (Fix 2: useAnnotations)                          │
   4.1 rawDelete ──▶ 4.4 verify exploration             │
   4.2 rawCreate ──▶ 4.4                                 ├──▶ Task 5 (verification)
   4.3 error helper ──▶ 4.4, 4.5                          │        │
                     ──▶ 4.5 verify preservation ─────────┘        ▼
                                                              Task 6 (checkpoint)
```

- Tasks 1 & 2 have no dependencies and gate all implementation (write/run before any fix).
- Task 3 (Fix 1) and Task 4 (Fix 2) are independent of each other; 4.1–4.3 can proceed in parallel, then 4.4/4.5 depend on all three.
- Tasks 5 and 6 depend on Tasks 3 and 4 completing.

## Correctness Properties Reference (from design.md)

- **Property 1** (Bug Condition, validates 2.1, 2.2): render DPR clamped to `[2,3]`, SSR=2.
- **Property 2** (Bug Condition, validates 2.3–2.6): temp-id skips server DELETE; `404` = success; transient retried once; no persistent error.
- **Property 3** (Preservation, validates 3.1, 3.2): fit-to-width, `overlayScale`, alignment, range loading, callbacks unchanged.
- **Property 4** (Preservation, validates 3.3–3.8): create/erase/redo/revert/`applyNewId`/history/filtering + genuine-failure rollback unchanged.
