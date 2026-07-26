# Bugfix Requirements Document

## Introduction

The PDF viewer used across Note-Sphere (mounted by `components/dashboard/NotesList.tsx`, `app/shared/[token]/page.tsx`, and `app/shared/collection/[token]/page.tsx`) has two distinct defects, both rooted in `components/modals/PDFPreviewModal.tsx` and `components/modals/PDFDocument.tsx`:

- **Bug 1 — Zoom does not visibly resize the page (worst on mobile).** The modal owns a `scale` value (`0.6`–`2.5` in 20% steps) that is passed straight through to react-pdf's `<Page scale={scale}>`. Because there is no fit-to-container baseline, `scale` multiplies the PDF's *intrinsic* width. On a phone the page at 100% is already wider than the viewport; the page sits in a `flex justify-center` container inside an `overflow-auto` wrapper, so an oversized page is center-clipped and the ±20% steps are imperceptible. The percentage label changes but the rendered page does not visibly change size.

- **Bug 2 — The entire PDF still downloads (slow load) despite S3 CORS exposing range headers.** `PDFDocument.tsx` passes `PDF_OPTIONS = { disableAutoFetch: true, disableStream: false, rangeChunkSize: 65536 }` to `<Document>`. With `disableStream: false`, pdf.js falls back to streaming the whole file rather than fetching only the byte ranges for the current page, so large/image-heavy PDFs remain slow even though the S3 bucket now exposes `Accept-Ranges`, `Content-Range`, `Content-Length`, and `ETag`.

Both fixes must preserve all existing annotation, navigation, and loading behavior, and annotations must stay perfectly aligned with the page at every zoom level.

## Bug Analysis

### Current Behavior (Defect)

**Bug 1 — Zoom does not visibly resize the page**

1.1 WHEN the user taps zoom in / zoom out on a viewport narrower than the page's intrinsic width (typical mobile) THEN the system updates the percentage label but the rendered page size does not visibly change, because `scale` is applied to the intrinsic page width with no fit-to-container baseline.

1.2 WHEN the rendered page is wider than the `overflow-auto` viewer container THEN the system center-clips the page (via `flex justify-center`) rather than making the full width reachable, so the effect of `scale` changes is hidden off-screen.

**Bug 2 — Whole PDF downloads on load**

1.3 WHEN a PDF is opened and `<Document>` is given `PDF_OPTIONS` with `disableStream: false` THEN pdf.js streams the entire file as a fallback instead of issuing HTTP Range requests for the current page's byte ranges.

1.4 WHEN a large or image-heavy PDF is opened over a connection where S3 already exposes `Accept-Ranges` / `Content-Range` / `Content-Length` / `ETag` THEN the system still loads slowly because the whole-file stream negates the benefit of range support.

### Expected Behavior (Correct)

**Bug 1 — Zoom visibly resizes the page**

2.1 WHEN the viewer renders a page at 100% THEN the system SHALL render the page fit to the viewer's available width (a fit-to-width baseline), so the full page width is visible without horizontal clipping on mobile.

2.2 WHEN the user zooms in THEN the system SHALL render a visibly larger page and make the overflowing width reachable via horizontal scroll (not center-clipped); WHEN the user zooms out THEN the system SHALL render a visibly smaller page.

2.3 WHEN the page is rendered at any zoom level THEN the system SHALL keep the annotation overlay (highlights and scribbles) perfectly aligned with the page, because the overlay is sized to `unscaledWidth * effectiveScale` and must use the same effective scale as the `<Page>`.

**Bug 2 — Only needed byte ranges are fetched**

2.4 WHEN a PDF is opened THEN the system SHALL configure `<Document>` with `disableStream: true` (together with `disableAutoFetch: true` and `rangeChunkSize`) so pdf.js fetches only the byte ranges required for the current page via HTTP Range requests instead of streaming the whole file.

2.5 WHEN documenting the fix THEN the system SHALL note the caveats that optimal range fetching also depends on the S3 CORS `ExposeHeaders` (already configured) and ideally linearized ("web-optimized") PDFs, and that image-heavy pages are inherently larger.

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the user creates highlights, scribbles, or uses the eraser THEN the system SHALL CONTINUE TO create, render, and persist those annotations exactly as before.

3.2 WHEN the user uses undo, redo, or revert-all THEN the system SHALL CONTINUE TO apply those operations exactly as before.

3.3 WHEN the user uses jump-to-page or the previous/next page navigation controls THEN the system SHALL CONTINUE TO change pages exactly as before.

3.4 WHEN the user triggers the mobile / hardware Back gesture THEN the system SHALL CONTINUE TO close the viewer (via `useHistoryBackClose`) rather than navigating away from the app.

3.5 WHEN a note is opened from the dashboard (`NotesList`) or from a public share page (`app/shared/[token]` and `app/shared/collection/[token]`) THEN the system SHALL CONTINUE TO load and render the PDF for both entry points.

3.6 WHEN annotations are created at one zoom level and viewed at another THEN the system SHALL CONTINUE TO store them as scale-independent normalized coordinates and render them correctly, so alignment holds across all zoom levels.

3.7 WHEN a PDF loads successfully THEN the system SHALL CONTINUE TO report `numPages`, drive page navigation bounds, and display load/error states exactly as before (the document identity in `useMemo` must remain stable so the document does not reload).

---

## Bug Condition Derivation

The following formalizes each defect using the bug-condition methodology. `F` denotes the original (unfixed) behavior and `F'` the fixed behavior. Fix Checking asserts the corrected behavior over buggy inputs; Preservation Checking asserts `F(X) = F'(X)` over all non-buggy inputs.

### Bug 1 — Zoom rendering

**Bug Condition**

```pascal
FUNCTION isBugCondition_Zoom(X)
  INPUT: X = { intrinsicWidth, containerWidth, zoomLevel }  // PDFPreviewModal scale state -> PDFDocument <Page scale>
  OUTPUT: boolean

  // Bug manifests when scale is applied to the intrinsic width with no
  // fit-to-container baseline, so the rendered width can exceed the container
  // and zoom steps are imperceptible / clipped.
  RETURN usesRawIntrinsicScale(X)          // scale multiplies intrinsicWidth, no fit-to-width baseline
         AND X.intrinsicWidth > X.containerWidth   // e.g. mobile viewport
END FUNCTION
```

**Fix Checking (Property over buggy inputs)**

```pascal
// For all inputs where zoom rendering is broken, the fixed viewer must
// (a) fit the page to the container width at 100%, (b) resize visibly on
// zoom with horizontal scroll instead of clipping, and (c) keep the overlay aligned.
FOR ALL X WHERE isBugCondition_Zoom(X) DO
  rendered <- renderPage'(X)                 // F'
  ASSERT rendered.widthAt100Percent == fitToWidth(X.containerWidth)
  ASSERT zoomIn(X)  produces visiblyLarger(rendered) AND horizontalScrollAvailable(rendered)
  ASSERT zoomOut(X) produces visiblySmaller(rendered)
  ASSERT overlayScale(rendered) == pageEffectiveScale(rendered)   // perfect alignment
END FOR
```

### Bug 2 — Whole-file streaming

**Bug Condition**

```pascal
FUNCTION isBugCondition_Load(X)
  INPUT: X = { documentOptions }             // PDF_OPTIONS passed to <Document>
  OUTPUT: boolean

  // Bug manifests when streaming is enabled, causing pdf.js to fetch the whole
  // file instead of per-page byte ranges.
  RETURN X.documentOptions.disableStream == false
END FUNCTION
```

**Fix Checking (Property over buggy inputs)**

```pascal
// For all inputs where the whole file is streamed, the fixed configuration must
// use range-based fetching for the current page only.
FOR ALL X WHERE isBugCondition_Load(X) DO
  opts <- documentOptions'(X)                // F'
  ASSERT opts.disableStream == true
  ASSERT opts.disableAutoFetch == true
  ASSERT opts.rangeChunkSize > 0
  ASSERT fetchStrategy(opts) == RANGE_REQUESTS_FOR_CURRENT_PAGE
END FOR
```

### Preservation Checking (both bugs)

```pascal
// For all inputs that do NOT trigger either bug condition, the fixed viewer
// must behave identically to the original: annotation create/render/persist,
// undo/redo/revert, jump-to-page, page navigation, mobile Back-to-close,
// dashboard + public-share loading, and normalized-coordinate alignment.
FOR ALL X WHERE NOT isBugCondition_Zoom(X) AND NOT isBugCondition_Load(X) DO
  ASSERT F(X) == F'(X)
END FOR
```
