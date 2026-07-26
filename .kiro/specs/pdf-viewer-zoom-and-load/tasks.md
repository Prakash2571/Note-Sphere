# Implementation Plan

- [ ] 1. Write bug condition exploration observations (BEFORE any fix)
  - **Property 1: Bug Condition** - Container-Relative Zoom + Range-Only Fetch
  - **CRITICAL**: Observe on UNFIXED code first - these observations confirm the bugs exist
  - **DO NOT fix code while observing**
  - **GOAL**: Surface counterexamples for both defects
  - C1 (zoom): On a ~375px viewport, tap zoom in/out and confirm the page canvas does NOT visibly resize and the right edge is clipped, while the `%` label still advances (fails on unfixed code). At 100% confirm the page is wider than the viewport instead of fitting it.
  - C2 (load): Open a large PDF and confirm a single full-file `200` GET instead of `206` partial-content responses (fails on unfixed code).
  - Edge: reload and confirm no crash before the container is measured.
  - Document counterexamples (raw intrinsic `scale`, `flex justify-center` clipping, `disableStream: false`).
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ] 2. Record preservation baselines (BEFORE any fix)
  - **Property 3: Preservation** - All Existing Viewer Behavior
  - **IMPORTANT**: Observation-first - record current behavior for non-bug paths on UNFIXED code
  - Observe: highlight/scribble/eraser create + persist; undo/redo/revert-all; jump-to-page and prev/next bounds; mobile Back closes via `useHistoryBackClose`; dashboard + both share pages load; previously-stored normalized annotations render aligned; `numPages`/load/error states and stable `useMemo({ url })` document identity.
  - Confirm all behave correctly on UNFIXED code (baseline to preserve).
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [ ] 3. Fix PDF viewer zoom rendering and whole-file load

  - [ ] 3.1 PDFDocument.tsx (Fix 2): range-only loading
    - Change module-level `PDF_OPTIONS` to `{ disableAutoFetch: true, disableStream: true, rangeChunkSize: 65536 }` (keep at module scope for stable identity).
    - _Bug_Condition: isBugCondition via C2 (disableStream == false)_
    - _Expected_Behavior: disableStream/disableAutoFetch true, rangeChunkSize > 0, range GETs for current page_
    - _Requirements: 2.4, 2.5_

  - [ ] 3.2 PDFDocument.tsx (Fix 1): container-relative width + aligned overlay
    - Add optional prop `containerWidth?: number` to `PDFDocumentProps`.
    - Compute `fitWidth = containerWidth > 0 ? containerWidth : undefined`; `pageWidth = fitWidth ? Math.max(fitWidth * scale, 100) : undefined`.
    - Render `<Page width={pageWidth} scale={pageWidth ? undefined : scale}>`; keep `devicePixelRatio = min(window.devicePixelRatio || 1, 2)` and `onRenderSuccess` viewport reporting.
    - Compute `overlayScale = pageWidth && unscaledWidth > 0 ? pageWidth / unscaledWidth : scale` and pass `scale={overlayScale}` to `<AnnotationOverlay>`.
    - _Bug_Condition: isBugCondition via C1 (raw intrinsic scale, intrinsicWidth > containerWidth)_
    - _Expected_Behavior: fit-to-width at 100%, visible monotonic resize, overlay effectiveScale == pageWidth/unscaledWidth_
    - _Requirements: 2.1, 2.2, 2.3, 3.6_

  - [ ] 3.3 PDFPreviewModal.tsx (Fix 1): measure container + scroll layout
    - Add `viewerRef` on the `overflow-auto` container; track `containerWidth` state initialized from `window.innerWidth`.
    - Measure `clientWidth - pad` (pad 24 for `p-3`, 48 at `sm:p-6` ≥640px), clamped at 0, via `ResizeObserver` + on mount; disconnect on cleanup.
    - Restructure inner wrapper to `mx-auto w-fit` for the PDF so zoomed pages scroll instead of center-clipping; keep loading/error states centered.
    - Pass `containerWidth={containerWidth}` to `<PDFDocument>` (zoom controls and `%` label unchanged; 100% now = fit-to-width).
    - _Bug_Condition: isBugCondition via C1_
    - _Expected_Behavior: fit-to-width baseline, horizontal scroll on zoom-in, no clipping_
    - _Preservation: Preservation Requirements from design_
    - _Requirements: 2.1, 2.2, 3.5_

  - [ ] 3.4 Verify bug condition exploration now passes
    - **Property 1: Expected Behavior** - Container-Relative Zoom + Range-Only Fetch
    - **IMPORTANT**: Re-check the SAME observations from task 1 - do NOT write new checks
    - Confirm: at 100% `pageWidth == containerWidth`; zoom-in yields larger page with horizontal scroll; zoom-out yields smaller page; overlay `effectiveScale == page scale`; `PDF_OPTIONS` is range-only; network shows `206` partial responses.
    - **EXPECTED OUTCOME**: Bugs are resolved.
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ] 3.5 Verify preservation baselines still hold
    - **Property 3: Preservation** - All Existing Viewer Behavior
    - **IMPORTANT**: Re-check the SAME baselines from task 2 - do NOT write new checks
    - Confirm annotations/undo/redo/revert/jump/nav/back-to-close/share loading and stored-annotation alignment are unchanged; `useMemo({ url })` identity stays stable (no reload on `containerWidth`/`scale` change).
    - **EXPECTED OUTCOME**: No regressions.
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [ ] 4. Checkpoint - Ensure everything passes
  - Run build/type-check; manually verify: 100% fits width, +/- resizes visibly, annotations stay aligned, network shows `206` ranged responses.
  - Ensure all checks pass; ask the user if questions arise.

## Task Dependency Graph

```
1 (explore bugs, UNFIXED)   2 (preservation baselines, UNFIXED)
          \                        /
           +----------+-----------+
                      v
        3.1 (Fix 2: PDF_OPTIONS)  3.2 (Fix 1: PDFDocument)
                      \             /
                       v           v
                 3.3 (Fix 1: PDFPreviewModal)
                            |
              +-------------+-------------+
              v                           v
   3.4 (verify Property 1)      3.5 (verify Property 3)
              \                           /
               +------------+------------+
                            v
                    4 (final checkpoint)
```

- Tasks 1 and 2 (observation-first) MUST run on UNFIXED code before task 3.
- 3.2 and 3.3 together deliver Fix 1 (Property 1); 3.1 delivers Fix 2 (Property 2).
- 3.4 re-runs task 1 observations (Property 1/2 satisfied); 3.5 re-runs task 2 baselines (Property 3 preserved).

## Correctness Property Reference

- **Property 1 (Bug Condition C1)**: fit-to-width at 100%, visible monotonic zoom with horizontal scroll, overlay `effectiveScale == pageWidth / unscaledWidth`. Validates Requirements 2.1, 2.2, 2.3.
- **Property 2 (Bug Condition C2)**: `disableStream: true`, `disableAutoFetch: true`, `rangeChunkSize > 0` → range requests for current page. Validates Requirements 2.4, 2.5.
- **Property 3 (Preservation)**: all non-bug viewer behavior identical to original. Validates Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7.
