# PDF Viewer Zoom and Load Bugfix Design

## Overview

The PDF viewer (`components/modals/PDFPreviewModal.tsx` + `components/modals/PDFDocument.tsx`, mounted from `NotesList`, `app/shared/[token]`, and `app/shared/collection/[token]`) has two independent defects addressed here:

- **Fix 1 — Zoom does not visibly resize the page.** Today `scale` is passed straight into react-pdf's `<Page scale={scale}>`, so it multiplies the PDF's *intrinsic* width with no fit-to-container baseline. On mobile the page at 100% is already wider than the viewport, and the page lives in a `flex justify-center` block inside an `overflow-auto` container, so an oversized page is center-clipped and the ±20% steps are imperceptible. The fix introduces a **container-relative (fit-to-width)** baseline: measure the scroll container's available content width and render `<Page width={containerWidth * scale}>`. At 100% the page fits the viewer width; zoom in/out visibly resizes and overflow becomes horizontally scrollable (not clipped). The annotation overlay is aligned by feeding it the *effective* render scale derived from the rendered width.

- **Fix 2 — The whole PDF still downloads.** `PDF_OPTIONS` currently sets `disableStream: false`, so pdf.js streams the entire file instead of issuing ranged GETs for the current page. Flipping to `disableStream: true` (with `disableAutoFetch: true` and `rangeChunkSize`) makes pdf.js fetch only the byte ranges it needs.

Both fixes are surgical and confined to `PDFPreviewModal.tsx` and `PDFDocument.tsx`. `AnnotationOverlay.tsx` and `lib/annotations/coordinates.ts` are **unchanged** — the overlay already sizes itself to `unscaledWidth * scale` and normalizes/denormalizes through `dims.scale`, so passing it the correct effective scale is sufficient to keep every annotation pixel-aligned.

## Glossary

- **Bug_Condition (C)**: The union of two conditions — (C1) zoom is applied to the intrinsic page width with no fit-to-container baseline while `intrinsicWidth > containerWidth`, and (C2) `<Document>` is configured with `disableStream: false`.
- **Property (P)**: The desired behavior — (P1) the page fits the container width at 100%, resizes visibly on zoom with horizontal scroll, and keeps the overlay aligned; (P2) the document is fetched via HTTP Range requests for the current page only.
- **Preservation**: All annotation, navigation, loading, and coordinate behavior for inputs that do not trigger either bug must remain byte-for-byte identical.
- **containerWidth**: The available content width (in CSS px) of the `overflow-auto` viewer scroll container = `clientWidth` minus horizontal padding (`p-3` → 24px total; `sm:p-6` → 48px total at ≥640px).
- **fitWidth / pageWidth**: `fitWidth = containerWidth (if > 0)`; `pageWidth = max(fitWidth * scale, 100)` — the pixel width handed to `<Page width>`.
- **unscaledWidth / unscaledHeight**: The page's intrinsic dimensions from `page.getViewport({ scale: 1 })`, reported via `onRenderSuccess`.
- **effectiveScale (overlayScale)**: The real render scale of the page = `pageWidth / unscaledWidth` (falls back to `scale` before measurement). Passed to `AnnotationOverlay` so its box (`unscaledWidth * scale`) matches the `<Page>` exactly.
- **F / F'**: Original (unfixed) / fixed behavior.

## Bug Details

### Bug Condition

The bug manifests in two independent ways:

**C1 — Zoom rendering.** `PDFPreviewModal` owns `scale` (0.6–2.5 in 0.2 steps) and passes it into `<Page scale={scale}>`. Because `scale` multiplies the *intrinsic* page width and there is no fit-to-container baseline, when the intrinsic width exceeds the container width (typical mobile), the page overflows a `flex justify-center` wrapper and is center-clipped by `overflow-auto`, so zoom steps are imperceptible.

**C2 — Loading.** `<Document options={PDF_OPTIONS}>` is given `disableStream: false`, so pdf.js falls back to streaming the whole file rather than fetching per-page byte ranges.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input = { intrinsicWidth, containerWidth, zoomLevel, documentOptions }
  OUTPUT: boolean

  // C1: zoom applied to intrinsic width, no fit-to-width baseline, on a narrow viewport
  zoomBug := usesRawIntrinsicScale(input)
             AND input.intrinsicWidth > input.containerWidth

  // C2: streaming enabled -> whole-file download
  loadBug := input.documentOptions.disableStream == false

  RETURN zoomBug OR loadBug
END FUNCTION
```

### Examples

- **Mobile zoom (C1):** iPhone-width viewport (~375px container), intrinsic page width ~612px. Expected: at 100% the page fits ~375px; tapping zoom-in produces a visibly larger page reachable via horizontal scroll. Actual: percentage label changes (100% → 120%) but the rendered page appears the same size and its right edge is clipped off-screen.
- **Desktop zoom (C1 boundary):** wide viewer where intrinsic width < container width — zoom still works today but must continue to fit-to-width at 100% and resize visibly after the fix.
- **Whole-file load (C2):** opening a 20 MB image-heavy PDF triggers a full-file GET (200) instead of ranged GETs (206), so first paint is slow even though S3 exposes `Accept-Ranges`/`Content-Range`.
- **Edge — pre-measurement:** on first render `containerWidth` is `0`/undefined; the viewer must fall back to `scale` rendering without a crash or flash.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Highlight / scribble / eraser creation, rendering, and persistence (Req 3.1).
- Undo, redo, and revert-all (Req 3.2).
- Jump-to-page and previous/next navigation with correct bounds (Req 3.3).
- Mobile/hardware Back gesture closes the viewer via `useHistoryBackClose` (Req 3.4).
- Loading from the dashboard (`NotesList`) and both public share pages (Req 3.5).
- Scale-independent normalized-coordinate storage and alignment across zoom levels (Req 3.6).
- `numPages` reporting, navigation bounds, load/error states, and a **stable document identity** (`useMemo` on `{ url }`) so the document does not reload (Req 3.7).

**Scope:**
All inputs that do NOT involve the zoom-rendering path or the document fetch strategy are completely unaffected. This includes annotation gestures, navigation controls, the Back-to-close behavior, and both share entry points. The actual corrected behavior is defined in the Correctness Properties below.

## Hypothesized Root Cause

1. **No fit-to-container baseline (C1).** `<Page scale={scale}>` multiplies the intrinsic width. Without measuring the container, 100% has no relationship to the viewport, so on mobile the page is born wider than the screen and zoom steps are swamped by the overflow.
2. **Center-clipping layout (C1).** The `flex justify-center` wrapper centers an oversized page, pushing its edges out of the `overflow-auto` viewport instead of making them scrollable.
3. **Overlay tied to `scale` (C1 alignment risk).** The overlay is sized to `unscaledWidth * scale`. If the `<Page>` renders by `width` while the overlay uses the raw `scale`, the two diverge. The effective scale (`pageWidth / unscaledWidth`) must be shared.
4. **Streaming enabled (C2).** `disableStream: false` lets pdf.js stream the whole file. With `disableStream: true`, pdf.js issues ranged GETs; the `Content-Range` header supplies the total size so no HEAD is needed — important because the S3 URL is a **GET-presigned** URL (a HEAD would not be signed).

## Correctness Properties

Property 1: Bug Condition - Container-Relative Zoom With Aligned Overlay

_For any_ input where the zoom bug condition holds (`isBugCondition` true via C1 — intrinsic width exceeds container width with no fit baseline), the fixed viewer SHALL render the page fit to the container width at 100% (`pageWidth == containerWidth` when `scale == 1`), render a visibly larger page with horizontal scroll on zoom-in and a visibly smaller page on zoom-out (monotonic in `scale`, never center-clipped), and size the annotation overlay with `effectiveScale == pageWidth / unscaledWidth` so it is pixel-aligned with the `<Page>` at every zoom level.

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Bug Condition - Range-Only Document Fetch

_For any_ input where the load bug condition holds (`isBugCondition` true via C2 — `disableStream == false`), the fixed configuration SHALL set `disableStream: true`, `disableAutoFetch: true`, and `rangeChunkSize > 0`, causing pdf.js to fetch only the byte ranges required for the current page via HTTP Range requests instead of streaming the whole file.

**Validates: Requirements 2.4, 2.5**

Property 3: Preservation - All Existing Viewer Behavior

_For any_ input where the bug condition does NOT hold (annotation gestures, undo/redo/revert, jump/navigation, Back-to-close, dashboard/share loading, and normalized-coordinate rendering), the fixed code SHALL produce the same result as the original function, preserving all existing functionality. Because `AnnotationOverlay` and `coordinates.ts` normalize/denormalize through `dims.scale`, feeding the overlay `effectiveScale` keeps both new and previously-stored annotations pixel-aligned.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7**

## Fix Implementation

### Changes Required — Fix 1 (container-relative zoom + aligned overlay)

**File**: `components/modals/PDFPreviewModal.tsx`

1. **Measure the container.** Add a `viewerRef` on the `overflow-auto` scroll container and track `containerWidth` in state:
   ```tsx
   const viewerRef = useRef<HTMLDivElement | null>(null);
   const [containerWidth, setContainerWidth] = useState<number>(
     typeof window !== "undefined" ? window.innerWidth : 0 // first estimate, avoids flash
   );
   ```
   Compute the available content width as `clientWidth` minus horizontal padding (24px for `p-3`, 48px at `sm:p-6` when width ≥ 640px):
   ```tsx
   useEffect(() => {
     const el = viewerRef.current;
     if (!el) return;
     const measure = () => {
       const pad = window.innerWidth >= 640 ? 48 : 24; // sm:p-6 vs p-3 (both sides)
       setContainerWidth(Math.max(el.clientWidth - pad, 0));
     };
     measure(); // on mount
     const ro = new ResizeObserver(measure);
     ro.observe(el);
     return () => ro.disconnect(); // cleanup
   }, []);
   ```

2. **Restructure the viewer wrapper** so an oversized page scrolls and centers instead of being center-clipped. Attach `viewerRef` to the `overflow-auto` container, and replace the inner `flex justify-center` with a block wrapper `mx-auto w-fit` for the PDF (centers when small, scrolls horizontally when larger than the container). Keep loading/error states centered.
   ```tsx
   <div ref={viewerRef} className="flex-1 overflow-auto bg-[#0b1120] p-3 sm:p-6">
     {isLoading && !pdfUrl ? (
       <div className="flex justify-center"> ...loading... </div>
     ) : error ? (
       <div className="flex justify-center"> ...error... </div>
     ) : pdfUrl ? (
       <div className="mx-auto w-fit">
         <PDFDocument ... containerWidth={containerWidth} />
       </div>
     ) : null}
   </div>
   ```

3. **Pass `containerWidth`** to `<PDFDocument>`. The zoom controls and `Math.round(scale * 100)%` label are unchanged; 100% now means fit-to-width. Zoom range 0.6–2.5 unchanged.

**File**: `components/modals/PDFDocument.tsx`

4. **Accept `containerWidth`** as a new optional prop and compute the render width:
   ```tsx
   const fitWidth = containerWidth && containerWidth > 0 ? containerWidth : undefined;
   const pageWidth = fitWidth ? Math.max(fitWidth * scale, 100) : undefined;
   ```
   Render `<Page>` using `width` when known, falling back to `scale` before measurement:
   ```tsx
   <Page
     pageNumber={currentPage}
     width={pageWidth}
     scale={pageWidth ? undefined : scale}
     renderMode="canvas"
     devicePixelRatio={typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 2) : 1}
     renderTextLayer
     renderAnnotationLayer
     onRenderSuccess={(page) => {
       const viewport = page.getViewport({ scale: 1 });
       onPageDimensions?.({ unscaledWidth: viewport.width, unscaledHeight: viewport.height });
     }}
     className="overflow-hidden rounded-xl shadow-2xl"
   />
   ```
   `devicePixelRatio = min(window.devicePixelRatio || 1, 2)` and the `onRenderSuccess` viewport reporting are unchanged.

5. **Align the overlay** with the *effective* render scale so its pixel box (`unscaledWidth * scale`) exactly matches the rendered page:
   ```tsx
   const overlayScale =
     pageWidth && unscaledWidth && unscaledWidth > 0 ? pageWidth / unscaledWidth : scale;
   ```
   Pass `scale={overlayScale}` to `<AnnotationOverlay>` (replacing the current `scale={scale}`). Because `AnnotationOverlay` and `coordinates.ts` both normalize/denormalize using `dims.scale`, using `overlayScale` keeps new highlights/scribbles *and* previously-stored normalized annotations pixel-aligned with the page at every zoom level (Req 2.3, 3.6).

### Changes Required — Fix 2 (range-only loading)

**File**: `components/modals/PDFDocument.tsx`

6. **Flip streaming off** in the module-level `PDF_OPTIONS` (kept at module scope for stable identity):
   ```tsx
   const PDF_OPTIONS = {
     disableAutoFetch: true,
     disableStream: true,   // was false
     rangeChunkSize: 65536,
   } as const;
   ```
   `disableStream: true` stops whole-file streaming, so pdf.js issues ranged GETs; `Content-Range` returns the total size (no HEAD request needed — important because the S3 URL is GET-presigned). Caveats: optimal range fetching also depends on the S3 CORS `ExposeHeaders` (`Accept-Ranges`, `Content-Range`, `Content-Length`, `ETag` — already configured) and ideally linearized ("web-optimized") PDFs; image-heavy first pages are inherently large.

### Not Changed

`components/modals/AnnotationOverlay.tsx` and `lib/annotations/coordinates.ts` require **no changes**. The overlay already derives its box and all coordinate conversions from `dims.scale`; supplying `overlayScale` is the only integration needed.

### Interface Summary

- `PDFDocumentProps` gains: `containerWidth?: number;`
- `PDFPreviewModal` passes `containerWidth={containerWidth}` into `<PDFDocument>`.
- `<AnnotationOverlay scale>` is fed `overlayScale` (computed in `PDFDocument`) instead of the raw `scale`.

## Testing Strategy

### Validation Approach

Two-phase: first surface counterexamples that demonstrate each bug on the UNFIXED code, then verify the fix works and preserves existing behavior. Because these defects are DOM/rendering and network behaviors in a Next.js + react-pdf viewer, validation is primarily **code inspection plus manual verification** in the browser, complemented by property statements that can be asserted where the environment allows.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bugs BEFORE implementing the fix, confirming (or refuting) the root-cause analysis.

**Test Plan**: Open a representative PDF in the viewer on both a narrow (mobile) and wide (desktop) viewport, and inspect the network tab, before touching the code.

**Test Cases**:
1. **Mobile zoom (C1)**: On a ~375px viewport, tap zoom-in/zoom-out and observe the rendered page size vs. the percentage label (page does not visibly resize / right edge clipped — fails on unfixed code).
2. **Fit-to-width baseline (C1)**: At 100% confirm the page is wider than the viewport instead of fitting it (fails on unfixed code).
3. **Whole-file load (C2)**: Open a large PDF and observe a single full-file `200` GET rather than `206` partial-content responses (fails on unfixed code).
4. **Edge — pre-measurement**: Reload and confirm there is no crash before the container is measured (baseline behavior).

**Expected Counterexamples**:
- Percentage label advances but the page canvas dimensions are unchanged and clipped.
- Network shows a `200` full download instead of `206` ranged responses.
- Possible causes: raw intrinsic `scale`, `flex justify-center` clipping, `disableStream: false`.

### Fix Checking

**Goal**: For all inputs where the bug condition holds, the fixed viewer produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  // Fix 1
  IF zoomBug(input) THEN
    ASSERT pageWidth(scale=1) == containerWidth              // fit-to-width at 100%
    ASSERT pageWidth(scaleUp) > pageWidth(scale=1)           // visibly larger, scrollable
    ASSERT pageWidth(scaleDown) < pageWidth(scale=1)         // visibly smaller
    ASSERT overlayEffectiveScale == pageWidth / unscaledWidth // aligned
  // Fix 2
  IF loadBug(input) THEN
    ASSERT PDF_OPTIONS.disableStream == true
    ASSERT PDF_OPTIONS.disableAutoFetch == true
    ASSERT PDF_OPTIONS.rangeChunkSize > 0
    ASSERT fetchStrategy == RANGE_REQUESTS_FOR_CURRENT_PAGE
END FOR
```

### Preservation Checking

**Goal**: For all inputs where the bug condition does NOT hold, the fixed viewer behaves identically to the original.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT F(input) == F'(input)
END FOR
```

**Testing Approach**: Observe behavior on the UNFIXED code first for the non-bug paths, then verify the same behavior after the fix. Property-based reasoning applies to the normalized-coordinate alignment invariant (holds for all `scale` because overlay and page share the effective scale) and to monotonicity of `pageWidth` in `scale`.

**Test Cases**:
1. **Annotation alignment (Req 3.1, 3.6)**: Create a highlight/scribble at 100%, zoom in/out, and confirm it stays locked to the same text/region; confirm previously-stored annotations render aligned at every zoom.
2. **Undo/redo/revert (Req 3.2)**: Confirm operations behave as before.
3. **Navigation (Req 3.3)**: Jump-to-page and prev/next respect bounds unchanged.
4. **Back-to-close (Req 3.4)**: Mobile/hardware Back closes the viewer via `useHistoryBackClose`.
5. **Entry points (Req 3.5)**: Dashboard and both public share pages load and render.
6. **Document stability (Req 3.7)**: `numPages`, load/error states unchanged; the `useMemo` `{ url }` identity stays stable so the document does not reload when `containerWidth`/`scale` change.

### Unit Tests

- Container-width computation: `clientWidth - pad` with `pad` 24 (<640) / 48 (≥640), clamped at 0.
- `pageWidth` computation: `max(fitWidth * scale, 100)`; `undefined` when `containerWidth <= 0`.
- `overlayScale` computation: `pageWidth / unscaledWidth`, falling back to `scale`.
- `PDF_OPTIONS` shape asserts `disableStream === true`, `disableAutoFetch === true`, `rangeChunkSize > 0`.

### Property-Based Tests

- For random `scale` in [0.6, 2.5] and random `containerWidth > 0`: `pageWidth` is strictly monotonic in `scale`, and `pageWidth(1) == containerWidth` when `containerWidth * 1 >= 100`.
- For random stored `NormRect`/`NormPoint` and random `scale`: `toPixel*(toNormalized*(px)) == px` under `dims.scale = overlayScale`, so overlay boxes match the page width (`unscaledWidth * overlayScale == pageWidth`).

### Integration Tests

- Full flow on a narrow viewport: open PDF → 100% fits width → zoom in shows larger page with horizontal scroll → annotate → zoom out → annotation stays aligned.
- Network verification: opening a large PDF issues `206 Partial Content` ranged responses rather than a single full-file `200`.
- Resize verification: rotating/resizing the viewport re-measures via `ResizeObserver` and re-fits the page; unmount disconnects the observer (no leak).
