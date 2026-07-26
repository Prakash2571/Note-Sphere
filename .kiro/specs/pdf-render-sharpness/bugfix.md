# Bugfix Requirements Document

## Introduction

PDF text and graphics render soft/blurry in the Note-Sphere viewer, most noticeably on
mobile devices. The viewer in `components/modals/PDFDocument.tsx` renders fit-to-width via
`<Page width={pageWidth}>`, where `pageWidth = Math.max(containerWidth * scale, 100)`. On a
phone the container is only ~360-410 CSS px, so at 100% zoom an entire page is rasterized
into roughly ~400 CSS px of width. The canvas backing resolution is `pageWidth × devicePixelRatio`,
so with a typical device `window.devicePixelRatio` of 2 the whole page is drawn into only
~800 backing pixels — far fewer than the page's intrinsic ~600-800pt width would receive when
displayed larger. The result is soft glyph edges.

A previous mitigation set
`devicePixelRatio = Math.min(Math.max(window.devicePixelRatio || 1, 2), 3)`. On the common case
where `window.devicePixelRatio` is exactly 2, this expression evaluates to
`min(max(2, 2), 3) = 2` — a no-op. It never increased the backing resolution, so fit-to-width
rendering remained less sharp than the older intrinsic-scale rendering.

The fix is to compute a dynamic supersampling `devicePixelRatio` so the page is always
rasterized to about 2x its intrinsic point width, independent of the (smaller) display size,
while clamping to a memory-safe range and preserving all existing viewer behavior.

## Bug Analysis

### Current Behavior (Defect)

What currently happens when a page is rendered fit-to-width on a device whose backing
resolution ends up below the page's intrinsic width.

1.1 WHEN a page is rendered fit-to-width on a small container (e.g. mobile ~360-410 CSS px) such that the effective backing width (`pageWidth × devicePixelRatio`) is well below the page's intrinsic point width (`unscaledWidth`) THEN the system rasterizes the page at too low a backing resolution and text/graphics render soft/blurry
1.2 WHEN `window.devicePixelRatio` is exactly 2 THEN the system's `Math.min(Math.max(window.devicePixelRatio || 1, 2), 3)` clamp evaluates to 2 (a no-op) and never raises the backing resolution above the display-driven value
1.3 WHEN the page's intrinsic width (`unscaledWidth`) is known after `onRenderSuccess` but `pageWidth` is much smaller than `unscaledWidth` THEN the system still uses a display-derived `devicePixelRatio` and does not supersample to match the intrinsic width, so sharpness is lost versus the older intrinsic-scale rendering

### Expected Behavior (Correct)

What should happen instead: dynamic supersampling that targets ~2x the intrinsic point width,
clamped for memory safety.

2.1 WHEN a page is rendered fit-to-width on a small container THEN the system SHALL rasterize the page at a backing width of approximately `unscaledWidth × QUALITY` (QUALITY = 2) so text/graphics render crisp, matching or exceeding native resolution
2.2 WHEN `window.devicePixelRatio` is exactly 2 (or any value) and `unscaledWidth` and `pageWidth` are known THEN the system SHALL compute `renderDpr = max((unscaledWidth × QUALITY) / pageWidth, min(deviceDpr, 2))` and clamp it to `[1.5, 4]`, then pass `renderDpr` to `<Page devicePixelRatio={...}>` (so the clamp is no longer a no-op)
2.3 WHEN the page's intrinsic width has not yet been measured (`unscaledWidth`/`pageWidth` unknown, including SSR where `deviceDpr` defaults to 2) THEN the system SHALL fall back to `Math.min(Math.max(deviceDpr, 2), 3)` (>= 2) as the render `devicePixelRatio`
2.4 WHEN the page is zoomed in so that `pageWidth` grows large THEN the system SHALL let the term `(unscaledWidth × QUALITY) / pageWidth` shrink toward `deviceDpr`, keeping rendering native-crisp without unbounded memory, bounded by the `[1.5, 4]` clamp

### Unchanged Behavior (Regression Prevention)

Existing behavior that must be preserved. `devicePixelRatio` only affects canvas backing
resolution, not CSS layout size, so layout, zoom, and alignment must be unaffected.

3.1 WHEN a user changes zoom THEN the system SHALL CONTINUE TO apply fit-to-width sizing (`pageWidth = containerWidth × scale`) and display the correct `%` zoom label
3.2 WHEN annotations are displayed at any zoom level THEN the system SHALL CONTINUE TO align the annotation overlay using `overlayScale` (`pageWidth / unscaledWidth`), unchanged by the new `devicePixelRatio`
3.3 WHEN a page is viewed THEN the system SHALL CONTINUE TO use range-only loading (`disableAutoFetch`, byte-range requests) without eagerly downloading the whole file
3.4 WHEN a user performs annotation actions THEN the system SHALL CONTINUE TO support undo/redo, eraser, and revert exactly as before
3.5 WHEN a user navigates THEN the system SHALL CONTINUE TO support jump-to-page and the mobile Back-to-close behavior
3.6 WHEN a PDF is opened from the dashboard or a public share page THEN the system SHALL CONTINUE TO load and render as before
3.7 WHEN a device's effective render resolution is already at or above the intrinsic width (e.g. zoomed in or high-DPR desktop) THEN the system SHALL CONTINUE TO render with the same effective sharpness as before, without unbounded canvas growth

## Bug Condition and Properties

### Bug Condition

```pascal
FUNCTION isBugCondition(X)
  INPUT: X of type RenderState { unscaledWidth, pageWidth, deviceDpr, appliedDpr }
  OUTPUT: boolean

  // The page's intrinsic width is known, and the backing resolution actually
  // applied is below ~2x the intrinsic point width (i.e. under-sampled).
  RETURN X.unscaledWidth > 0
         AND X.pageWidth > 0
         AND (X.pageWidth * X.appliedDpr) < (X.unscaledWidth * 2)
END FUNCTION
```

Concretely, the current code sets `appliedDpr = min(max(deviceDpr, 2), 3)`. On mobile with
`deviceDpr = 2`, `pageWidth ~= 400`, `unscaledWidth ~= 612`: backing width `= 400 × 2 = 800`,
which is `< 612 × 2 = 1224`, so `isBugCondition` is true — the page is under-sampled and blurry.

### Property: Fix Checking

```pascal
// F' = fixed PDFDocument render path
FOR ALL X WHERE isBugCondition(X) DO
  renderDpr <- F'(X)
  // backing width reaches ~2x intrinsic width, within the memory-safe clamp
  ASSERT (X.pageWidth * renderDpr) >= (X.unscaledWidth * 2) OR renderDpr = 4
  ASSERT renderDpr >= 1.5 AND renderDpr <= 4
END FOR
```

### Property: Preservation Checking

```pascal
// F  = original render path, F' = fixed render path
// Preservation applies to everything devicePixelRatio does NOT control:
// CSS layout size, overlayScale, zoom label, loading, annotation actions, navigation.
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT layoutAndBehavior(F(X)) = layoutAndBehavior(F'(X))
END FOR
```

**Key Definitions:**
- **F**: The original (unfixed) `PDFDocument` render path with the no-op `devicePixelRatio` clamp.
- **F'**: The fixed render path with dynamic supersampling `renderDpr`.
- **QUALITY**: Supersample factor = 2 (target ~2x intrinsic point width).
- **deviceDpr**: `window.devicePixelRatio || 1` (SSR default: 2).
