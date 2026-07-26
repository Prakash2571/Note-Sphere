# Implementation Plan: PDF Annotations

## Overview

This plan implements the PDF annotation overlay feature for the Note-Sphere Next.js 16 / React 19 app following an incremental, bottom-up path: test tooling first, then pure logic modules (fully property-tested in isolation), then the Mongoose model, then the server route handlers, and finally the client components and their wiring into the existing `PDFDocument` / `PDFPreviewModal`.

Each task builds on the previous ones and ends by wiring the pieces together, so there is no orphaned code. Pure modules (`lib/annotations/*`) are implemented before the components and handlers that consume them; the model precedes the routes that persist through it; the overlay/toolbar/hook precede the modal integration that mounts them. All work is TypeScript, matching the established stack (Next.js route handlers, Auth.js v5, Mongoose, react-pdf).

Testing follows the design's dual approach: one fast-check property test per correctness property (configured for a minimum of 100 iterations, `{ numRuns: 100 }`) plus `@testing-library/react` example/component tests for the non-property acceptance criteria. Each property test is tagged with `// Feature: pdf-annotations, Property {number}: {property_text}`.

## Tasks

- [x] 1. Set up test tooling and configuration
  - Add Vitest, fast-check, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`, and `@vitejs/plugin-react` as dev dependencies in `package.json`
  - Create `vitest.config.ts` with the `jsdom` environment, React plugin, and the existing `@/*` path alias; add a `"test": "vitest --run"` script
  - Add a test setup file registering `@testing-library/jest-dom` matchers
  - _Requirements: supports Testing Strategy for all requirements_

- [x] 2. Implement the coordinate module (`lib/annotations/coordinates.ts`)
  - [x] 2.1 Implement pure coordinate conversion functions
    - Define `NormPoint`, `NormRect`, and `PageDims` types
    - Implement `toNormalizedPoint`, `toNormalizedRect`, `toPixelPoint`, `toPixelRect`, and `clamp01`
    - Normalize by dividing scaled pixel values by `unscaledWidth * scale` / `unscaledHeight * scale`; make `toPixel*` the exact inverse of `toNormalized*` at a fixed scale
    - _Requirements: 2.2, 2.3, 7.2_

  - [ ]* 2.2 Write property test for scale-independent inverse mapping
    - **Property 2: Coordinate mapping is an exact, scale-independent inverse**
    - **Validates: Requirements 2.2, 2.3, 4.5**
    - Generate arbitrary pixel coords, unscaled dims, and two scales in `[0.6, 2.5]`; assert normalize→pixel reproduces location scaled by the scale ratio within 1px
  - [ ]* 2.3 Write property test for in-range normalization
    - **Property 3: Normalization always yields in-range coordinates**
    - **Validates: Requirements 7.2**
    - Generate arbitrary in-bounds pixel coords and page dims; assert every normalized component is in `[0, 1]`

- [x] 3. Implement the validation module (`lib/annotations/validation.ts`)
  - [x] 3.1 Implement palette and input validation
    - Define `PALETTE` (>= 6 distinct colors) and `PaletteColor` type
    - Implement `isNormalized`, `isValidPage`, `isPaletteColor`, and `validateAnnotationInput(input, pageCount)` returning `ValidationResult`
    - Reject absent/non-numeric/out-of-range coordinates, non-integer/out-of-range pages, and non-palette colors; name the offending field
    - _Requirements: 6.1, 6.4, 6.5, 7.3, 7.4, 7.5, 7.6_

  - [ ]* 3.2 Write property test for validation soundness
    - **Property 4: Input validation soundness**
    - **Validates: Requirements 7.3, 7.4, 7.5, 7.6, 6.4, 6.5**
    - Generate valid inputs plus arbitrary invalid mutations (NaN/absent/out-of-range coords, non-integer/out-of-range pages, non-palette colors); assert accept-iff-all-valid

- [x] 4. Implement the serialization module (`lib/annotations/serialize.ts`)
  - [x] 4.1 Implement serialize/deserialize
    - Define the `Annotation` domain type, `CreateAnnotationInput`, and `AnnotationDTO` wire shapes
    - Implement `serializeAnnotation` and `deserializeAnnotation` as exact inverses that pass numbers through unchanged and preserve coordinate count and order
    - _Requirements: 7.1, 1.2, 4.2, 4.5_

  - [ ]* 4.2 Write property test for serialization round-trip
    - **Property 1: Serialization round-trip preserves annotations**
    - **Validates: Requirements 7.1, 1.2, 4.2, 4.5**
    - Generate arbitrary valid highlights (1..N rects) and scribbles (2..10000 points); assert `type`/`pageNumber`/`color` exactly equal and coordinates match within `0.000001`, count and order preserved

- [x] 5. Implement the jump-to-page parser (`lib/annotations/pageInput.ts`)
  - [x] 5.1 Implement `parseJumpInput`
    - Return `{ ok: true, page }` for whole numbers in `[1, totalPages]`, `{ ok: false, reason: "out-of-range" }` for whole numbers outside range, and `{ ok: false, reason: "not-integer" }` for decimals/non-numeric/empty/whitespace
    - _Requirements: 5.1, 5.2, 5.3_

  - [ ]* 5.2 Write property test for jump input classification
    - **Property 8: Jump-to-page input is classified totally and correctly**
    - **Validates: Requirements 5.1, 5.2, 5.3**
    - Generate arbitrary strings and integers in/out of range plus totalPages; assert exhaustive, correct classification

- [x] 6. Implement the per-tool color state reducer (`lib/annotations/colorState.ts`)
  - [x] 6.1 Implement color-state logic
    - Model per-tool active colors (`highlight`, `scribble`) with deterministic defaults (`highlightColor = PALETTE[0]`, `scribbleColor = PALETTE[2]`)
    - Implement a pure reducer/selector where selecting a color updates only that tool's active color
    - _Requirements: 6.2, 6.3_

  - [ ]* 6.2 Write property test for per-tool color independence
    - **Property 10: Per-tool active color independence**
    - **Validates: Requirements 6.2**
    - Generate arbitrary sequences of `(tool, color)` selections; assert each tool reflects its most recent selection and others are unchanged

- [x] 7. Checkpoint - Ensure all pure-module tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement the Mongoose model (`models/Annotation.ts`)
  - [x] 8.1 Create the Annotation schema
    - Define `IAnnotation`, `INormRect`, `INormPoint`, and `AnnotationType`
    - Define `NormRectSchema`/`NormPointSchema` (`min: 0, max: 1`), the `AnnotationSchema` (indexed `userId`/`noteId`, integer-validated `pageNumber` with `min: 1`, `enum: PALETTE` color, `strokeWidth` `min: 1, max: 20`, `timestamps: true`), and the `{ noteId, userId, pageNumber }` compound index
    - Use the `mongoose.models.Annotation || mongoose.model(...)` guard, importing `PALETTE` from `@/lib/annotations/validation`
    - _Requirements: 1.3, 2.4, 4.1, 6.4, 6.5, 7.2, 7.4, 7.6_

  - [ ]* 8.2 Write unit tests for schema validators
    - Assert coordinate `min/max`, color `enum`, integer `pageNumber`, and `strokeWidth` bounds reject invalid documents
    - _Requirements: 6.5, 7.2, 7.4, 7.6_

- [x] 9. Implement the annotations list route (`app/api/notes/[id]/annotations/route.ts`)
  - [x] 9.1 Implement GET, POST, and DELETE-all handlers
    - Follow the existing `app/api/notes/[id]/route.ts` pattern: `await auth()` → 401 if no `session.user.id` → `await params` → `connectDB()` → ownership check via `Note.findOne({ _id: id, userId: session.user.id })` (404 if null)
    - GET returns `{ annotations: AnnotationDTO[] }` (empty array when none, capped at 5000); POST validates via `validateAnnotationInput` using `note.pageCount`, persists an `Annotation` carrying `userId`+`noteId`, returns 201 or 400; DELETE removes all annotations for `{ noteId, userId }` and returns `{ deletedCount }`
    - Scope every annotation query to `session.user.id`; never write to S3
    - _Requirements: 1.2, 1.3, 2.1, 2.4, 2.5, 2.6, 2.7, 3.1, 3.3, 3.5, 6.5, 7.3, 7.4, 7.5, 7.6_

  - [ ]* 9.2 Write property test for ownership scoping
    - **Property 5: Ownership scoping invariant**
    - **Validates: Requirements 1.3, 2.1, 2.4**
    - With a mocked store, generate arbitrary userIds/noteIds/record sets; assert creates carry the owner's `userId`+`noteId` and reads/deletes never touch other users' records
  - [ ]* 9.3 Write property test for clear-all completeness and idempotence
    - **Property 6: Clear-all removes exactly the note's annotations and is idempotent**
    - **Validates: Requirements 3.1, 3.5**
    - Generate arbitrary initial record sets (including empty); assert zero remain for the note+owner, success is returned, and re-applying is a no-op
  - [ ]* 9.4 Write unit tests for auth and validation error branches
    - Assert 401 with no session (no store interaction, Req 2.5), 404 for non-owner (Req 2.6), 400 for invalid coord/page/color (Req 6.5, 7.3-7.6), 500 with no partial set on list failure (Req 2.7), and that no S3 write helper is imported (Req 3.3)
    - _Requirements: 2.5, 2.6, 2.7, 3.3, 6.5, 7.3, 7.4, 7.5, 7.6_

- [x] 10. Implement the single-annotation delete route (`app/api/notes/[id]/annotations/[annotationId]/route.ts`)
  - [x] 10.1 Implement DELETE-one handler
    - Auth + ownership check, then delete the annotation matching `{ _id: annotationId, noteId: id, userId: session.user.id }`; return 200 on success, 404 when not found/not owned, 401 when unauthenticated
    - _Requirements: 2.4, 2.5, 2.6_

  - [ ]* 10.2 Write unit tests for the delete-one handler
    - Assert 401/404 guards and that only the owner's matching annotation is removed
    - _Requirements: 2.4, 2.5, 2.6_

- [x] 11. Add annotation cleanup to the existing note delete route
  - [x] 11.1 Extend `app/api/notes/[id]/route.ts` DELETE
    - After the note is deleted, call `Annotation.deleteMany({ noteId: id, userId: session.user.id })` so orphaned annotations are cleared; leave the S3 source handling unchanged
    - _Requirements: 2.4, 3.1_

- [x] 12. Checkpoint - Ensure all server tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. Implement the `useAnnotations` hook (`components/modals/useAnnotations.ts`)
  - [x] 13.1 Implement annotation state and network calls
    - Load all records on mount via `GET` (tolerate up to 5000); expose `byPage(page)`, `loading`, `error`, `createHighlight`, `createScribble`, `deleteOne`, and `revertAll`
    - Optimistic create: render immediately then `POST`; on highlight failure remove the optimistic highlight and surface error (Req 1.6); on scribble failure retain the rendered scribble and surface error (Req 4.7); on `revertAll` failure preserve the local set (Req 3.7)
    - _Requirements: 1.6, 2.1, 3.7, 4.7_

  - [ ]* 13.2 Write property test for per-page filtering
    - **Property 9: Per-page rendering selects exactly that page's annotations**
    - **Validates: Requirements 5.4**
    - Generate arbitrary annotation sets across arbitrary page numbers; assert `byPage(p)` returns exactly the records with `pageNumber === p`
  - [ ]* 13.3 Write component tests for optimistic-failure handling
    - Mock `POST`/`DELETE` failures; assert highlight rollback (Req 1.6), scribble retention (Req 4.7), and clear-all preservation (Req 3.7)
    - _Requirements: 1.6, 3.7, 4.7_

- [x] 14. Implement the `AnnotationOverlay` component (`components/modals/AnnotationOverlay.tsx`)
  - [x] 14.1 Implement the SVG overlay and capture logic
    - Absolutely position an SVG sized to `unscaledWidth * scale` × `unscaledHeight * scale`; render highlights as `<rect>` (reduced opacity) and scribbles as `<path>`/`<polyline>` with pixel `stroke-width`, mapping normalized coords via `coordinates.ts`
    - Highlight capture: on selection while `tool === "highlight"`, convert `range.getClientRects()` → page-relative pixels → `NormRect[]`, calling `onCreateHighlight`; do nothing on empty/collapsed selection (Req 1.5)
    - Scribble capture: pointer events build a point list; on `pointerup` with >= 2 distinct points call `onCreateScribble`, else discard (Req 4.6); set `pointer-events` per active tool
    - _Requirements: 1.1, 1.5, 2.2, 2.3, 4.1, 4.6_

  - [ ]* 14.2 Write property test for degenerate no-ops
    - **Property 7: Degenerate inputs are no-ops**
    - **Validates: Requirements 1.5, 4.6**
    - Generate empty/whitespace/collapsed selections and strokes reducing to < 2 distinct points; assert no create callback fires and the annotation set is unchanged
  - [ ]* 14.3 Write component test for highlight rendering
    - Simulate a text selection; assert overlay `<rect>`s render in the active color (Req 1.1)
    - _Requirements: 1.1_

- [x] 15. Implement the `AnnotationToolbar` component (`components/modals/AnnotationToolbar.tsx`)
  - [x] 15.1 Implement the toolbar UI
    - Render `PALETTE` swatches (per-tool active color via the color-state reducer), tool switch (`none`/`highlight`/`scribble`), stroke-width control (1..20), a controlled jump-to-page input using `parseJumpInput` (inline error distinguishing out-of-range from not-integer), and a revert button that opens a confirmation dialog (delete only fires on confirm)
    - _Requirements: 1.4, 3.4, 3.6, 4.1, 4.3, 5.1, 5.2, 5.3, 6.1, 6.2, 6.3_

  - [ ]* 15.2 Write component tests for the toolbar
    - Assert palette shows >= 6 distinct colors (Req 6.1), deterministic defaults (Req 6.3), per-tool color persistence (Req 1.4, 4.3), jump-to-page invalid inputs leave state unchanged with correct message (Req 5.2, 5.3), and revert confirm/cancel behavior (Req 3.4, 3.6)
    - _Requirements: 1.4, 3.4, 3.6, 4.3, 5.2, 5.3, 6.1, 6.3_

- [x] 16. Integrate the overlay into `PDFDocument.tsx`
  - [x] 16.1 Wire `onRenderSuccess` and mount the overlay
    - Add `onRenderSuccess` on `<Page>` to capture `page.getViewport({ scale: 1 })` and lift `{ unscaledWidth, unscaledHeight }` to the modal; wrap `<Page>` in a `position: relative` container and render `<AnnotationOverlay>` as a positioned sibling; forward `tool`, `activeColor`, `strokeWidth`, and the create callbacks
    - Suppress text selection (`user-select: none`) on the text layer while `tool === "scribble"` (Req 4.4)
    - _Requirements: 2.2, 2.3, 4.4_

- [x] 17. Integrate the toolbar and state into `PDFPreviewModal.tsx`
  - [x] 17.1 Wire modal state and mount the toolbar
    - Hold `tool`, `highlightColor`, `scribbleColor`, and `strokeWidth` state (via the color-state reducer); mount `AnnotationToolbar`; instantiate `useAnnotations(noteId)`; wire jump-to-page to the existing `setCurrentPage`, pass the current `scale` to the overlay, and connect revert-all
    - Ensure only the current page's annotations render after a jump (Req 5.4) and reloaded scribbles/highlights render at their normalized positions (Req 2.5, 4.5)
    - _Requirements: 2.5, 3.2, 4.5, 5.1, 5.4_

  - [ ]* 17.2 Write integration test for scribble-mode selection suppression
    - Assert that activating scribble mode suppresses text selection so drawing does not trigger selection (Req 4.4), and that revert clears the overlay (Req 3.2)
    - _Requirements: 3.2, 4.4_

- [x] 18. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 19. Implement the geometry hit-test module (`lib/annotations/hitTest.ts`)
  - [ ] 19.1 Implement pure geometry helpers
    - Implement `rectsIntersect`, `intersectRect` (zero-area result when disjoint), `pointInRect`, `pointNearSegment` (distance point→segment clamped to the segment endpoints), and `annotationHitByPoint` (highlight: point in any rect; scribble: point within `strokeWidth / 2` normalized + epsilon of any consecutive segment)
    - Operate on `NormRect`/`NormPoint` from `coordinates.ts` and `AnnotationDTO` from `serialize.ts`; keep the module pure with no I/O
    - _Requirements: 8.3, 9.1, 9.3, 9.4_

  - [ ]* 19.2 Property test for hit-testing correctness
    - **Property 11: Hit-testing correctness**
    - **Validates: Requirements 9.1, 9.3, 9.4**
    - Generate arbitrary highlight/scribble annotations plus arbitrary pointer points (inside/outside rects, near/far from segments); assert `annotationHitByPoint` returns `true` iff the point is in a rect (highlight) or within tolerance of a segment (scribble)
  - [ ]* 19.3 Property test for rectangle intersection correctness
    - **Property 12: Rectangle intersection correctness**
    - **Validates: Requirements 8.3**
    - Generate arbitrary overlapping and disjoint `NormRect` pairs plus probe points; assert `intersectRect` yields the geometric intersection when overlapping and a zero-area rect when disjoint, and that a point lies in the result iff it lies in both inputs

- [ ] 20. Add the eraser to the Tool model (`lib/annotations/colorState.ts`)
  - [ ] 20.1 Extend the `Tool` union with `"eraser"`
    - Change `Tool` to `"none" | "highlight" | "scribble" | "eraser"`; keep `ColorTool` and `activeColorFor` working (eraser falls back to the highlight color, which is unused by the eraser)
    - _Requirements: 9.5_

- [ ] 21. Fix touch/pointer input and pointer-based highlighting in `AnnotationOverlay.tsx`
  - [ ] 21.1 Unify interactive-tool pointer handling
    - Treat any `tool !== "none"` as interactive: set `touch-action: none` and `pointer-events: auto`; call `e.preventDefault()` on `pointerdown` for all interactive tools; use `setPointerCapture` to bind the pointer stream to the overlay
    - _Requirements: 8.1, 8.2, 8.4_

  - [ ] 21.2 Replace highlight capture with a pointer drag
    - Track a drag rectangle with a faint preview `<rect>`; on `pointerup` build the drag rect from the start/end points; query `".react-pdf__Page__textContent span"`, intersect each span with the drag rect (`rectsIntersect`/`intersectRect`), and produce `NormRect`s; fall back to the dragged region when no text intersects; treat a zero-area drag as a no-op
    - _Requirements: 8.3, 8.5, 1.1_

  - [ ] 21.3 Add eraser hit-testing in the overlay
    - Add an `onErase?(annotationId)` prop; when `tool === "eraser"`, on `pointerdown`/`pointermove` convert the pointer position to a `NormPoint` and call `annotationHitByPoint` against the current page's annotations; call `onErase(_id)` for real (non-`temp-…`) ids; dedupe with a `Set` during the drag; no-op when nothing is hit
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [ ]* 21.4 Component tests for touch/pointer + eraser overlay behavior
    - Dispatch `pointerdown`/`pointermove`/`pointerup`; assert `touch-action: none` + `pointer-events: auto` while a tool is active and `auto`/`none` while `tool === "none"`; assert `preventDefault`/`setPointerCapture` fire; assert span-intersection highlighting, dragged-region fallback, zero-area no-op, and eraser hit behavior
    - _Requirements: 8.1, 8.2, 8.4, 8.5, 9.1, 9.3, 9.4_

- [ ] 22. Add the eraser button to `AnnotationToolbar.tsx`
  - [ ] 22.1 Add an eraser tool button
    - Add an eraser button using the `lucide-react` `Eraser` icon with `aria-pressed`, wired to `onToolChange("eraser")` following the existing tool-button pattern
    - _Requirements: 9.1, 9.5_

- [ ] 23. Wire touch fix + eraser through `PDFDocument.tsx` and `PDFPreviewModal.tsx`
  - [ ] 23.1 Thread the touch fix and eraser prop through `PDFDocument`
    - Apply `userSelect: none` + `touchAction: none` on the wrapper for any interactive tool (not just scribble); forward the new `onErase` prop to the overlay
    - _Requirements: 8.1, 8.2_

  - [ ] 23.2 Wire the eraser handler in `PDFPreviewModal`
    - Pass `onErase={annotations.deleteOne}` down to the overlay via `PDFDocument`
    - _Requirements: 9.1, 9.2, 9.6_

  - [ ]* 23.3 Integration test for eraser removal and touch scrolling
    - Assert the eraser removes a single annotation and that a touch drag does not scroll the page while a tool is active
    - _Requirements: 8.1, 9.1, 9.2_

- [ ] 24. Final checkpoint - verify touch fix and eraser
  - Ensure the feature builds/type-checks; verify on a touch viewport if possible.

## Notes

- Tasks marked with `*` are optional test sub-tasks and can be skipped for a faster MVP; core implementation sub-tasks are never optional.
- Each task references specific requirements (granular sub-requirements) for traceability, and each property test explicitly references its correctness property from the design document.
- Property tests use fast-check with a minimum of 100 iterations (`{ numRuns: 100 }`) and are tagged `// Feature: pdf-annotations, Property {n}: {text}`.
- Checkpoints ensure incremental validation at natural boundaries (pure logic, server, and full integration).
- Pure modules are built and tested before the components/handlers that consume them, and the modal integration is last so nothing is left orphaned.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "3.1", "5.1", "6.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "3.2", "4.1", "5.2", "6.2", "8.1"] },
    { "id": 3, "tasks": ["4.2", "8.2", "9.1"] },
    { "id": 4, "tasks": ["9.2", "9.3", "9.4", "10.1", "11.1", "13.1"] },
    { "id": 5, "tasks": ["10.2", "13.2", "13.3", "14.1"] },
    { "id": 6, "tasks": ["14.2", "14.3", "15.1"] },
    { "id": 7, "tasks": ["15.2", "16.1"] },
    { "id": 8, "tasks": ["17.1"] },
    { "id": 9, "tasks": ["17.2"] },
    { "id": 10, "tasks": ["19.1", "20.1"] },
    { "id": 11, "tasks": ["19.2", "19.3", "21.1", "22.1"] },
    { "id": 12, "tasks": ["21.2"] },
    { "id": 13, "tasks": ["21.3"] },
    { "id": 14, "tasks": ["21.4", "23.1"] },
    { "id": 15, "tasks": ["23.2"] },
    { "id": 16, "tasks": ["23.3"] }
  ]
}
```
