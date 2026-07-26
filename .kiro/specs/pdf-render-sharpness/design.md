# PDF Render Sharpness Bugfix Design

## Overview

PDF pages render soft/blurry in the Note-Sphere viewer, most visibly on mobile. The viewer in
`components/modals/PDFDocument.tsx` renders fit-to-width via `<Page width={pageWidth}>` where
`pageWidth = Math.max(containerWidth * scale, 100)`. The canvas backing resolution is
`pageWidth × devicePixelRatio`. On a phone the container is only ~360-410 CSS px, so an entire
page is rasterized into ~800 backing pixels (with `devicePixelRatio = 2`) — far fewer than the
page's intrinsic ~600-800pt width warrants — yielding soft glyph edges.

The previous mitigation `devicePixelRatio = Math.min(Math.max(window.devicePixelRatio || 1, 2), 3)`
is a no-op on the common case where `window.devicePixelRatio` is exactly `2`
(`min(max(2, 2), 3) = 2`). It never supersamples.

The fix is confined to `components/modals/PDFDocument.tsx`: compute a dynamic supersampling
`renderDpr` that targets ~2x the page's intrinsic point width regardless of the (smaller)
display size, floored to at least native crispness and capped for memory safety, then pass it to
`<Page devicePixelRatio={renderDpr} />`. Because `devicePixelRatio` only changes the canvas
backing store — not CSS layout size — all layout, zoom, and annotation-alignment behavior is
preserved.

## Glossary

- **Bug_Condition (C)**: The page's intrinsic width is known and the actually-applied backing
  width (`pageWidth × appliedDpr`) is below ~2x the intrinsic point width (`unscaledWidth × 2`) —
  i.e. the page is under-sampled and blurry.
- **Property (P)**: For under-sampled inputs the fixed render path SHALL produce a backing width
  of approximately `unscaledWidth × 2` (or hit the memory-safe ceiling), with `renderDpr` inside
  `[1.5, 4]`.
- **Preservation**: Everything `devicePixelRatio` does NOT control — CSS layout size,
  `overlayScale`, annotation alignment, fit-to-width sizing, the zoom `%` label, range-only
  loading, annotation actions, and navigation — must remain unchanged.
- **PDFDocument**: The component in `components/modals/PDFDocument.tsx` that renders one page via
  react-pdf `<Page>` and overlays annotations.
- **pageWidth**: `Math.max(containerWidth * scale, 100)` — the fit-to-width CSS pixel width of the
  page (undefined until the container is measured).
- **unscaledWidth**: The page's intrinsic point width, reported via `onRenderSuccess` /
  `getViewport({ scale: 1 }).width`.
- **deviceDpr**: `window.devicePixelRatio || 1` (SSR default: 2).
- **QUALITY**: Supersample factor = 2 (target ~2x intrinsic point width).
- **renderDpr**: The computed `devicePixelRatio` passed to `<Page>` in the fixed code (`F'`).

## Bug Details

### Bug Condition

The bug manifests when a page is rendered fit-to-width and the applied canvas backing width falls
below ~2x the page's intrinsic point width. This happens because the current `devicePixelRatio`
expression is derived only from the display DPR (and clamps to a no-op `2` on typical devices),
ignoring how small `pageWidth` is relative to `unscaledWidth`.

**Formal Specification:**
```
FUNCTION isBugCondition(X)
  INPUT: X of type RenderState { unscaledWidth, pageWidth, deviceDpr, appliedDpr }
  OUTPUT: boolean

  RETURN X.unscaledWidth > 0
         AND X.pageWidth > 0
         AND (X.pageWidth * X.appliedDpr) < (X.unscaledWidth * 2)
END FUNCTION
```

The current code sets `appliedDpr = min(max(deviceDpr, 2), 3)`.

### Examples

- Mobile, `deviceDpr = 2`, `pageWidth = 400`, `unscaledWidth = 612`: backing width
  `= 400 × 2 = 800 < 612 × 2 = 1224` → **buggy** (blurry). Fixed: `renderDpr = (612 × 2)/400 ≈ 3.06`
  → backing `≈ 1224` (native 2x) → crisp.
- Mobile, `deviceDpr = 3`, `pageWidth = 390`, `unscaledWidth = 612`: applied `= 390 × 3 = 1170 < 1224`
  → **buggy**. Fixed: `renderDpr = (612 × 2)/390 ≈ 3.14` → backing `≈ 1224` → crisp.
- Desktop zoomed in, `pageWidth = 1000`, `unscaledWidth = 612`: applied `= 1000 × 2 = 2000 ≥ 1224`
  → **not buggy**. Fixed: term `= (612 × 2)/1000 ≈ 1.22`, floored to `min(deviceDpr, 2) = 2`
  → `renderDpr = 2` (native, unchanged effective sharpness).
- Pre-measurement (first paint, `unscaledWidth`/`pageWidth` unknown): fallback
  `min(max(deviceDpr, 2), 3) ≥ 2` — reasonable initial paint, then one re-render at the computed
  crisp dpr once measured.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Fit-to-width sizing (`pageWidth = containerWidth × scale`) and the `%` zoom label.
- Annotation overlay alignment via `overlayScale = pageWidth / unscaledWidth`.
- Range-only loading (`disableAutoFetch`, byte-range requests) — no eager full-file download.
- Annotation actions (highlight, scribble, eraser, undo/redo/revert) and navigation
  (jump-to-page, mobile back-to-close).
- Loading from the dashboard and from public share pages.

**Scope:**
All inputs where `isBugCondition` is false — and all viewer concerns other than canvas backing
resolution — must be completely unaffected by this fix. `devicePixelRatio` changes only the
canvas backing store, never CSS layout. This includes:
- Any already-native-or-better render (zoomed in, high-DPR desktop).
- The `<Page>` `width`, `scale`, `renderTextLayer`, `renderAnnotationLayer`, `onRenderSuccess`,
  and `className` props (all unchanged).
- `overlayScale`, `hasDims`, and the `AnnotationOverlay` props.

## Hypothesized Root Cause

1. **DPR derived from display size, not intrinsic width**: `devicePixelRatio` was computed purely
   from `window.devicePixelRatio`, so when `pageWidth` is much smaller than `unscaledWidth`
   (fit-to-width on mobile) the page is rasterized at far below its intrinsic resolution.

2. **No-op clamp on typical devices**: `Math.min(Math.max(window.devicePixelRatio || 1, 2), 3)`
   evaluates to `2` when `window.devicePixelRatio` is `2` (the common mobile/retina case), so the
   mitigation never raised backing resolution above the display-driven value.

3. **No supersampling target**: There is no term tying the backing width to `unscaledWidth`, so
   fit-to-width rendering is strictly display-bound and loses sharpness versus the older
   intrinsic-scale rendering.

## Correctness Properties

Property 1: Bug Condition - Dynamic Supersampling To Intrinsic Width

_For any_ input where the bug condition holds (`isBugCondition` returns true: `unscaledWidth > 0`,
`pageWidth > 0`, and `pageWidth × appliedDpr < unscaledWidth × 2`), the fixed function SHALL
compute `renderDpr` such that the resulting backing width reaches ~2x the intrinsic point width
(`pageWidth × renderDpr ≥ unscaledWidth × 2`) OR `renderDpr == 4` (the memory-safe ceiling), and
`renderDpr` SHALL be within `[1.5, 4]`.

**Validates: Requirements 2.1, 2.2, 2.4**

Property 2: Preservation - Layout, Alignment, And Behavior Unchanged

_For any_ input where the bug condition does NOT hold (`isBugCondition` returns false), the fixed
function SHALL produce the same result as the original function, preserving CSS layout size,
`overlayScale` (`pageWidth / unscaledWidth`), annotation alignment, fit-to-width sizing, the zoom
`%` label, range-only loading, annotation actions, and navigation — because `devicePixelRatio`
affects only the canvas backing store, not layout.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7**

## Fix Implementation

### Changes Required

The fix is confined to a single file. Only the `devicePixelRatio` value passed to `<Page>`
changes; a `renderDpr` value is computed in the component body and substituted for the current
inline expression.

**File**: `components/modals/PDFDocument.tsx`

**Function**: `PDFDocument` (component body)

**Where `renderDpr` is computed**: In the component body, immediately AFTER `pageWidth` and
`overlayScale` are computed (both are needed / conceptually adjacent) and BEFORE the `return`.
This keeps the memoized/derived values together and reads `pageWidth` and `unscaledWidth` that are
already in scope.

**Before** (current inline expression on `<Page>`):
```tsx
<Page
  pageNumber={currentPage}
  width={pageWidth}
  scale={pageWidth ? undefined : scale}
  renderMode="canvas"
  devicePixelRatio={
    typeof window !== "undefined"
      ? Math.min(
          Math.max(
            window.devicePixelRatio ||
              1,
            2
          ),
          3
        )
      : 2
  }
  renderTextLayer={true}
  renderAnnotationLayer={true}
  onRenderSuccess={(page) => { /* ... unchanged ... */ }}
  className="overflow-hidden rounded-xl shadow-2xl"
/>
```

**After** — add the derived value in the component body (after `overlayScale`):
```tsx
const QUALITY = 2; // supersample the page to ~2x its intrinsic point width
const deviceDpr =
  typeof window !== "undefined" ? (window.devicePixelRatio || 1) : 2;
const renderDpr =
  pageWidth && typeof unscaledWidth === "number" && unscaledWidth > 0
    ? Math.min(Math.max((unscaledWidth * QUALITY) / pageWidth, Math.min(deviceDpr, 2)), 4)
    : Math.min(Math.max(deviceDpr, 2), 3); // pre-measurement fallback
```

and reference it on `<Page>`:
```tsx
<Page
  pageNumber={currentPage}
  width={pageWidth}
  scale={pageWidth ? undefined : scale}
  renderMode="canvas"
  devicePixelRatio={renderDpr}
  renderTextLayer={true}
  renderAnnotationLayer={true}
  onRenderSuccess={(page) => { /* ... unchanged ... */ }}
  className="overflow-hidden rounded-xl shadow-2xl"
/>
```

Everything else on `<Page>` (`width`, `scale`, `renderMode`, layer flags, `onRenderSuccess`,
`className`) and everything else in the component (`overlayScale`, `hasDims`, `AnnotationOverlay`,
`PDF_OPTIONS`, worker setup) is unchanged.

### The Math

react-pdf's canvas backing width = `pageWidth (CSS px) × devicePixelRatio`.

1. **Supersampling term**: Setting `renderDpr = (unscaledWidth × QUALITY) / pageWidth` makes the
   backing width `= pageWidth × renderDpr = unscaledWidth × QUALITY ≈ 2x` the page's intrinsic
   point width. So fit-to-width is crisp even when the page is displayed small.
2. **Floor** `Math.max(..., Math.min(deviceDpr, 2))`: guarantees at least native crispness. When
   zoomed in, `pageWidth` is large so the supersampling term shrinks below 1; the floor keeps
   `renderDpr` at native (`min(deviceDpr, 2)`), never dropping resolution.
3. **Ceiling** `Math.min(..., 4)`: caps canvas memory so a tiny `pageWidth` cannot explode the
   backing store.
4. **Fallback** (before `unscaledWidth`/`pageWidth` known, incl. SSR where `deviceDpr = 2`):
   `Math.min(Math.max(deviceDpr, 2), 3) ≥ 2` — the initial paint is already reasonable; once
   `onRenderSuccess` reports `unscaledWidth` and the container is measured, the component
   re-renders once at the computed crisp dpr.

**Worked example**: `unscaledWidth = 612`, `pageWidth = 400` → `renderDpr = (612 × 2)/400 ≈ 3.06`
→ backing `≈ 1224` (native 2x) → crisp. Zoomed to `pageWidth = 1000` → term `= 1.22`, floored to
`2` → `renderDpr = 2` (native).

## Testing Strategy

### Validation Approach

This bug is a rendering-quality/visual defect driven by canvas backing resolution — it has no
pure return value to assert in a headless unit test (react-pdf renders to a real canvas). The
strategy is therefore: (1) reason about the arithmetic that produces `renderDpr` (which IS
verifiable), then (2) verify sharpness and preservation by inspection and manual device testing.
The `renderDpr` computation is a small pure expression whose properties can be checked by
evaluating it against representative `{ unscaledWidth, pageWidth, deviceDpr }` inputs.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the under-sampling before the fix, and confirm
the root cause (display-derived, no-op clamp).

**Test Plan**: Evaluate the CURRENT applied dpr expression `min(max(deviceDpr, 2), 3)` for the
buggy inputs and compute the resulting backing width; compare to `unscaledWidth × 2`. Manually,
open a PDF on a phone (or DevTools device emulation at ~400 CSS px) at 100% zoom and observe soft
glyph edges.

**Test Cases**:
1. **Mobile fit-to-width** (`deviceDpr = 2`, `pageWidth = 400`, `unscaledWidth = 612`): applied
   backing `= 800 < 1224` → under-sampled (blurry on unfixed code).
2. **High-DPR mobile** (`deviceDpr = 3`, `pageWidth = 390`, `unscaledWidth = 612`): applied
   `= 1170 < 1224` → under-sampled (blurry on unfixed code).
3. **DPR = 2 no-op check**: confirm `min(max(2, 2), 3) = 2`, proving the old clamp never raised
   resolution.

**Expected Counterexamples**:
- `pageWidth × appliedDpr < unscaledWidth × 2` on typical mobile inputs.
- Root cause confirmed: applied dpr is display-derived and clamps to a no-op at `deviceDpr = 2`.

### Fix Checking

**Goal**: For all inputs where the bug condition holds, the fixed expression yields a
backing width reaching ~2x intrinsic (or the ceiling), with `renderDpr ∈ [1.5, 4]`.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  renderDpr := computeRenderDpr(input.unscaledWidth, input.pageWidth, input.deviceDpr)
  ASSERT (input.pageWidth * renderDpr) >= (input.unscaledWidth * 2) OR renderDpr == 4
  ASSERT renderDpr >= 1.5 AND renderDpr <= 4
END FOR
```

### Preservation Checking

**Goal**: For all inputs where the bug condition does NOT hold, the fixed render path behaves
identically to the original with respect to everything `devicePixelRatio` does not control.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT layoutAndBehavior(F(input)) == layoutAndBehavior(F'(input))
  // pageWidth, overlayScale, zoom label, loading, annotation actions, navigation
END FOR
```

**Testing Approach**: `devicePixelRatio` provably affects only the canvas backing store, not CSS
layout — `pageWidth`, `overlayScale = pageWidth / unscaledWidth`, `hasDims`, and all
`AnnotationOverlay` inputs are computed independently of `renderDpr` and are unchanged by this fix.
Preservation is verified by (a) confirming those expressions are untouched in the diff, and (b)
manual checks that layout/alignment/zoom are visually identical.

**Test Plan**: Observe current layout, zoom label, and annotation alignment on the unfixed code;
after the fix, confirm they are byte-for-byte identical in behavior.

**Test Cases**:
1. **Fit-to-width sizing**: page still fits container at 100%; zoom resizes and `%` label matches.
2. **Annotation alignment**: highlights/scribbles align at multiple zoom levels (unchanged
   `overlayScale`).
3. **Zoomed-in / high-DPR**: effective sharpness unchanged; no unbounded canvas growth
   (floor keeps native, ceiling caps memory).

### Unit Tests

- Evaluate `computeRenderDpr` for buggy inputs → backing `≥ unscaledWidth × 2` or `renderDpr == 4`.
- Evaluate for zoomed-in inputs → floored to `min(deviceDpr, 2)` (native).
- Evaluate clamp bounds → result always in `[1.5, 4]`.

### Property-Based Tests

- Random `{ unscaledWidth, pageWidth, deviceDpr }` where `isBugCondition` holds → assert
  `pageWidth × renderDpr ≥ unscaledWidth × 2` OR `renderDpr == 4`, and `renderDpr ∈ [1.5, 4]`.
- Random inputs across the domain → `overlayScale` (`pageWidth / unscaledWidth`) is independent of
  `renderDpr` (preservation of alignment).

### Integration Tests

- Manual: open a real PDF on a device at 100% — text is crisp; zoom in — still crisp; confirm no
  layout or annotation-alignment change versus before.
- Confirm loading from dashboard and public share pages is unchanged.

### Edge Cases

- **`unscaledWidth`/`pageWidth` unknown (first paint, SSR)**: fallback
  `min(max(deviceDpr, 2), 3) ≥ 2`; re-renders once at crisp dpr after `onRenderSuccess`.
- **`deviceDpr` is 0 / undefined**: `window.devicePixelRatio || 1` yields `1`; SSR path uses `2`.
- **Very small `pageWidth`**: supersampling term grows large → capped by ceiling `4` (memory-safe).
- **Very large zoom (`pageWidth` large)**: term shrinks below native → floored to
  `min(deviceDpr, 2)`; no resolution drop.
- **Memory at max**: `renderDpr = 4` bounds the backing store even at the smallest `pageWidth`.

### Deployment Caveat

This change affects client-rendered output only. The sharpness improvement is visible only after a
**rebuild/redeploy and a browser cache refresh** (the bundled component and any cached assets must
be updated). Verify on a fresh load / hard refresh.
