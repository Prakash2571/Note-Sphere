# Implementation Plan

- [ ] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Fast First Page via Lazy Range Loading + Capped DPI
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples proving `PDFDocument` renders `<Document>` with no `options` (auto-fetch left on) and forces `devicePixelRatio = Math.max(window.devicePixelRatio, 2)`
  - **Scoped PBT Approach**: Scope to concrete failing cases from the Bug Condition (isBugCondition): preview opened with `options === undefined`; with `window.devicePixelRatio = 3`, `<Page>` resolves DPI to 3
  - Render/inspect the UNFIXED `PDFDocument`; assert `<Document>` receives no `options` prop and `<Page>` `devicePixelRatio` resolves to `max(dpr, 2)`
  - **EXPECTED OUTCOME**: Test FAILS (proves the bug exists)
  - Document counterexamples (e.g. "Document mounted with options=undefined", "DPR 3 -> devicePixelRatio 3")
  - _Requirements: 1.1, 1.3_

- [ ] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Existing Viewer Behavior Unchanged
  - **IMPORTANT**: Follow observation-first methodology - observe behavior on UNFIXED code first, then assert it
  - Observe & capture on unfixed code: annotation create/render/persist (highlight/scribble/eraser), text-layer selection, zoom scaling across 0.6-2.5, on-demand prev/next/jump page navigation, revert-all, and dashboard + public share-page loading
  - Write property-based tests capturing those observed behaviors (from Preservation Requirements in design); assert the `file={{ url }}` contract, `onLoadSuccess`/`onLoadError`, loading/error UI, and annotation-overlay wiring are unchanged
  - **EXPECTED OUTCOME**: Tests PASS on UNFIXED code (confirms baseline to preserve)
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [ ] 3. Fix for slow large-PDF preview (lazy range loading + capped DPI + CORS docs)

  - [ ] 3.1 Enable lazy/partial range loading in `components/modals/PDFDocument.tsx`
    - Add module-level constant: `const PDF_OPTIONS = { disableAutoFetch: true, disableStream: false, rangeChunkSize: 65536 } as const;` (module scope for stable identity, avoiding reload loops)
    - Pass `options={PDF_OPTIONS}` to `<Document>`, keeping `file`, `onLoadSuccess`, `onLoadError`, `loading`, `error`, `className` unchanged
    - _Bug_Condition: isBugCondition(X) where documentOptions(X) = NONE_
    - _Expected_Behavior: options.disableAutoFetch=true, disableStream=false, rangeChunkSize>0; stable reference across re-renders_
    - _Preservation: Preservation Requirements from design (file contract & callbacks unchanged)_
    - _Requirements: 2.1, 2.4_

  - [ ] 3.2 Cap render resolution on high-DPI devices in `components/modals/PDFDocument.tsx`
    - Change `<Page>` `devicePixelRatio` from `Math.max(window.devicePixelRatio, 2)` to `Math.min(window.devicePixelRatio || 1, 2)`, with SSR fallback `1` under the `typeof window` guard
    - _Bug_Condition: isBugCondition(X) where renderDevicePixelRatio(X) = max(window.devicePixelRatio, 2)_
    - _Expected_Behavior: renderDevicePixelRatio = min(window.devicePixelRatio || 1, 2)_
    - _Requirements: 2.3_

  - [ ] 3.3 Document required AWS S3 CORS in `README.md`
    - Add an "AWS S3 CORS (required for fast PDF loading)" section with sample CORS JSON (`AllowedMethods`: `GET`/`HEAD`; `ExposeHeaders`: `Accept-Ranges`, `Content-Range`, `Content-Length`, `ETag`) and explanation that Range requests fall back to full download without these headers
    - _Requirements: 2.5_

  - [ ] 3.4 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Fast First Page via Lazy Range Loading + Capped DPI
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - Assert `<Document>` receives `options={PDF_OPTIONS}` (disableAutoFetch=true, disableStream=false, rangeChunkSize>0) with a stable reference, and `<Page>` DPI is capped at 2 (min(dpr||1, 2))
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ] 3.5 Verify preservation tests still pass
    - **Property 2: Preservation** - Existing Viewer Behavior Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions in annotations, text layer, zoom, page navigation, revert, and share/dashboard pages)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [ ] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
  - Recommended manual check: measure before/after time-to-first-page on the 239-page PDF over a throttled connection and confirm `206 Partial Content` range requests in the network tab once S3 CORS exposes the range headers.

## Task Dependency Graph

```
Task 1 (Bug Condition exploration test)  ─┐
Task 2 (Preservation tests)              ─┤
                                          ▼
Task 3 (Fix): 3.1 options ─┐
              3.2 DPI cap  ─┤
              3.3 CORS docs─┤
                            ├─► 3.4 verify Property 1 (needs 1, 3.1, 3.2)
                            └─► 3.5 verify Property 2 (needs 2, 3.1, 3.2)
                                          ▼
                                     Task 4 (Checkpoint)
```

- Tasks 1 and 2 are independent and must be done first (before the fix), on UNFIXED code.
- Tasks 3.1, 3.2, 3.3 are the fix; 3.1 and 3.2 edit `PDFDocument.tsx`, 3.3 edits `README.md`.
- 3.4 depends on Task 1 + 3.1 + 3.2; 3.5 depends on Task 2 + 3.1 + 3.2.
- Task 4 depends on 3.4 and 3.5.
