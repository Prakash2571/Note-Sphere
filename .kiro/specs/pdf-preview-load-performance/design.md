# PDF Preview Load Performance Bugfix Design

## Overview

Previewing a large PDF (e.g. a 239-page file) in the Note-Sphere viewer is slow on
mobile: the first page can take ~10 seconds to appear over a slow connection. Two
behaviors in `components/modals/PDFDocument.tsx` cause this:

1. The react-pdf `<Document file={{ url }}>` is rendered with **no pdf.js
   `options`**. pdf.js therefore defaults to `disableAutoFetch: false` and eagerly
   downloads the **entire** file before/while rendering page 1 — even though only
   one page is shown at a time.
2. The `<Page>` forces `devicePixelRatio = Math.max(window.devicePixelRatio, 2)`,
   over-rendering the first paint at 2x–3x on high-DPI phones.

The fix is intentionally small and targeted, and touches only the viewer plus one
documentation section:

- **FIX 1 — Lazy/partial (range-request) loading.** Pass a stable, module-level
  `PDF_OPTIONS` object (`disableAutoFetch: true`, `disableStream: false`,
  `rangeChunkSize: 65536`) to `<Document>`. With auto-fetch disabled, pdf.js
  requests only the byte ranges needed for the currently rendered page (plus the
  cross-reference table / trailer) and fetches the rest on demand as the user
  navigates. This is the primary time-to-first-page win.
- **FIX 2 — Cap render resolution.** Change the `<Page>` `devicePixelRatio` from
  `Math.max(window.devicePixelRatio, 2)` to `Math.min(window.devicePixelRatio || 1, 2)`
  to cut first-paint work on high-DPI devices while staying crisp.
- **FIX 3 — Documentation.** Add an S3 CORS section to `README.md` describing the
  `ExposeHeaders` required for cross-origin HTTP Range requests to work.

The presigned URL is produced server-side by `app/api/notes/[id]/route.ts` (GET)
via `lib/s3.ts` `getPresignedUrl` (S3 `GetObject`, `expiresIn: 3600`). S3 supports
Range requests natively; the browser can only use them cross-origin when the bucket
CORS configuration exposes the range headers — hence FIX 3. No server code changes
are required.

## Glossary

- **Bug_Condition (C)**: The viewer opens a PDF preview with no pdf.js `options`
  (so `disableAutoFetch` is left `false` and the whole file is eagerly downloaded)
  and/or renders the page with a forced high-DPI ratio
  (`Math.max(window.devicePixelRatio, 2)`), making the first page slow to appear.
- **Property (P)**: For buggy inputs, the fixed viewer passes stable options with
  `disableAutoFetch: true`, `disableStream: false`, `rangeChunkSize > 0`, and caps
  `devicePixelRatio` to `min(window.devicePixelRatio || 1, 2)`, so only the current
  page's bytes are fetched initially (given S3 CORS exposes range headers).
- **Preservation**: All viewer behavior unrelated to document fetching / DPI —
  annotations, text selection, zoom, page navigation, revert, and dashboard/share
  behavior — remains identical.
- **PDFDocument**: The react-pdf wrapper component in
  `components/modals/PDFDocument.tsx` that renders `<Document>` and a single
  `<Page>`, plus the annotation overlay.
- **disableAutoFetch**: pdf.js option controlling whether the full file is fetched
  eagerly (`false`, default) or only requested ranges are fetched on demand (`true`).
- **rangeChunkSize**: The byte size of each Range request pdf.js issues (65536 = 64 KB).
- **F / F'**: The original (unfixed) viewer / the fixed viewer.

## Bug Details

### Bug Condition

The bug manifests whenever a PDF preview is opened. The `PDFDocument` component
passes no `options` to react-pdf's `<Document>`, so pdf.js runs with
`disableAutoFetch: false` and downloads the entire file up front; additionally the
`<Page>` forces `devicePixelRatio = Math.max(window.devicePixelRatio, 2)`, adding
avoidable rasterization cost to the first paint. On large documents over slow mobile
links these combine into a ~10s time-to-first-page.

**Formal Specification:**
```
FUNCTION isBugCondition(X)
  INPUT: X of type PdfPreviewRequest  // { url, pageCount, connection, devicePixelRatio }
  OUTPUT: boolean

  RETURN previewOpened(X)
         AND documentOptions(X) = NONE                          // no pdf.js options => disableAutoFetch:false
         OR renderDevicePixelRatio(X) = max(window.devicePixelRatio, 2)  // forced high-DPI over-render
END FUNCTION
```

### Examples

- **239-page PDF, slow mobile connection (actual/expected):** Actual — whole file
  downloads before page 1 appears (~10s). Expected — only page 1's byte range (plus
  xref/trailer) is fetched, first page appears in a fraction of the time.
- **High-DPI phone at DPR 3 (actual/expected):** Actual — canvas rasterized at 3x,
  extra first-paint work. Expected — capped at 2x, visually crisp, less work.
- **Small 2-page PDF (actual/expected):** Actual — full download (negligible impact).
  Expected — behaves the same; range loading offers little benefit but does no harm.
- **Edge — S3 CORS not exposing range headers:** Expected — browser cannot perform
  cross-origin Range requests; pdf.js gracefully falls back to a full download. The
  viewer still works correctly; the speed-up simply does not materialize until CORS
  is configured (FIX 3).

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Highlight / scribble / eraser annotation creation, rendering, and persistence
  (`AnnotationOverlay`, `useAnnotations`) must work exactly as before.
- Text-layer selection (`renderTextLayer={true}`) must remain unchanged.
- Zoom in / out across the existing range (0.6–2.5) must scale the page correctly.
- Page navigation (previous / next / jump-to-page) must display the requested page;
  fetching that page's data on demand is acceptable and desired.
- Revert-all annotations must behave as before.
- Previewing from the dashboard and from public share pages must load and render
  correctly with all features intact.
- The presigned-URL flow (`PDFPreviewModal` fetching `GET /api/notes/[id]` or using
  the `presignedUrl` prop) must be used to load the document exactly as before.

**Scope:**
All inputs that do NOT involve the eager-download / forced-DPI behavior must be
completely unaffected by this fix. In particular the fix must not change:
- The `file` object contract (`{ url }`) passed to `<Document>`.
- The `onLoadSuccess` / `onLoadError` callbacks or the loading/error UI.
- The annotation overlay wiring or `onPageDimensions` reporting.
- Any server-side route or S3 signing behavior.

The actual expected *correct* behavior for buggy inputs is defined in the
Correctness Properties section (Property 1). This section captures what must NOT
change.

## Hypothesized Root Cause

Based on the bug analysis, the causes are well isolated to `PDFDocument.tsx`:

1. **Missing pdf.js options (primary).** `<Document file={file}>` is rendered with
   no `options` prop. pdf.js defaults to `disableAutoFetch: false`, so the transport
   layer eagerly downloads the whole file regardless of how many pages are shown.
   This dominates time-to-first-page on large files over slow links.

2. **Forced high-DPI rendering (secondary).** `devicePixelRatio={Math.max(window.devicePixelRatio, 2)}`
   forces a *minimum* of 2x and scales up to the device's native ratio (3x on many
   phones), multiplying rasterization cost for the first paint.

3. **Deployment/config dependency (external).** Even with `disableAutoFetch: true`,
   cross-origin HTTP Range requests only work when the S3 bucket CORS exposes
   `Accept-Ranges`, `Content-Range`, `Content-Length` (and `ETag`). If those headers
   are not exposed, pdf.js falls back to a full download — so the code fix must be
   paired with documentation (FIX 3).

## Correctness Properties

Property 1: Bug Condition - Fast First Page via Lazy Range Loading + Capped DPI

_For any_ input where the bug condition holds (isBugCondition returns true — a
preview is opened with no pdf.js options and/or a forced high-DPI ratio), the fixed
`PDFDocument` SHALL pass a stable options object with `disableAutoFetch: true`,
`disableStream: false`, and `rangeChunkSize > 0`, and SHALL render the page with
`devicePixelRatio = min(window.devicePixelRatio || 1, 2)`, so that (given S3 CORS
exposes the range headers) only the current page's byte range is fetched initially
rather than the entire file.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

Property 2: Preservation - Existing Viewer Behavior Unchanged

_For any_ input where the bug condition does NOT hold (isBugCondition returns false —
all viewer behavior unrelated to document fetching and DPI), the fixed function SHALL
produce the same result as the original function, preserving annotation
create/render/persist, text-layer selection, zoom, on-demand page navigation,
revert, and dashboard/share-page loading.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7**

## Fix Implementation

### Changes Required

#### FIX 1 & FIX 2 — `components/modals/PDFDocument.tsx`

**Module-level constant (stable identity).** Add a single `PDF_OPTIONS` constant at
module scope so its reference never changes across renders. react-pdf treats a new
`options` object identity as a reason to reload/reparse the document; a module-level
constant avoids reload loops.

```tsx
// Module scope — stable identity so react-pdf does not reload the document.
const PDF_OPTIONS = {
  disableAutoFetch: true,  // fetch only requested byte ranges, not the whole file
  disableStream: false,    // keep streaming enabled so ranges flow progressively
  rangeChunkSize: 65536,   // 64 KB per Range request
} as const;
```

**Pass `options` to `<Document>`.** Add the `options` prop (keep `file`,
`onLoadSuccess`, `onLoadError`, `loading`, `error`, `className` unchanged):

```tsx
<Document
  file={file}
  options={PDF_OPTIONS}
  onLoadSuccess={onLoadSuccess}
  onLoadError={onLoadError}
  loading={/* unchanged */}
  error={/* unchanged */}
  className="flex justify-center"
>
```

Why this satisfies the bug condition / fix-checking: with `disableAutoFetch: true`
pdf.js requests only the byte ranges required for the currently rendered page (plus
the cross-reference table and trailer needed to locate objects), instead of
transferring all pages. `disableStream: false` lets those ranges stream in
progressively, and `rangeChunkSize: 65536` bounds each request. Subsequent pages are
fetched on demand during navigation — which is exactly the desired behavior in
Requirement 3.4.

**Cap render resolution (FIX 2).** Change the `<Page>` `devicePixelRatio` expression:

```tsx
// Before:
devicePixelRatio={
  typeof window !== "undefined" ? Math.max(window.devicePixelRatio, 2) : 2
}

// After:
devicePixelRatio={
  typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 2) : 1
}
```

This caps rasterization at 2x on high-DPI phones (crisp but cheaper), uses the true
ratio when it is below 2, defends against `window.devicePixelRatio` being `0`/`undefined`
via `|| 1`, and stays SSR-safe with the `typeof window` guard (SSR falls back to `1`).
Note: `PDFDocument` is already loaded via `dynamic(..., { ssr: false })` in
`PDFPreviewModal`, so in practice the browser branch runs, but the guard is retained
for safety.

No other props, callbacks, or the annotation overlay wiring change.

#### FIX 3 — `README.md`

Add a new section documenting the required S3 bucket CORS configuration:

```markdown
## AWS S3 CORS (required for fast PDF loading)

The PDF viewer uses HTTP Range requests so only the bytes for the current page are
fetched instead of the whole file. For the browser to use Range requests against a
presigned S3 URL cross-origin, the bucket CORS configuration MUST expose the
range-related response headers. Without `ExposeHeaders`, the browser cannot read
`Accept-Ranges` / `Content-Range` and pdf.js falls back to downloading the entire file.

Example bucket CORS configuration:

    [
      {
        "AllowedMethods": ["GET", "HEAD"],
        "AllowedOrigins": ["https://your-app-origin.example.com"],
        "AllowedHeaders": ["*"],
        "ExposeHeaders": ["Accept-Ranges", "Content-Range", "Content-Length", "ETag"]
      }
    ]

Replace `AllowedOrigins` with your deployed app origin (e.g. `http://localhost:3000`
for local development).
```

## Testing Strategy

### Validation Approach

The strategy follows the two-phase bugfix approach: first surface the current
behavior (no options passed, forced DPI), then verify the fix passes the options
stably, caps DPI, and preserves every other viewer feature. Because the fetching
behavior depends on the runtime browser transport and S3 CORS, correctness is
verified primarily by (a) code-level inspection/tests that the options and DPI are
correct and stable, and (b) a manual before/after measurement on a real large PDF
with range requests confirmed via the network tab.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples demonstrating the defect on the UNFIXED code, and
confirm the root cause (no `options` prop, forced-max DPI).

**Test Plan**: Inspect / render `PDFDocument` on the unfixed code and assert the
`<Document>` receives no `options` prop and the `<Page>` `devicePixelRatio` resolves
to `Math.max(window.devicePixelRatio, 2)`. Complement with a manual large-PDF load
to observe the whole-file transfer.

**Test Cases**:
1. **No options passed**: Assert the rendered `<Document>` has `options === undefined`
   on unfixed code (will fail after fix — confirms the gap).
2. **Forced DPI**: With `window.devicePixelRatio = 3`, assert the `<Page>` receives
   `devicePixelRatio = 3` (max(3,2)) on unfixed code.
3. **Manual large-PDF load**: Open the 239-page sample over a throttled connection;
   observe in the network tab that the full file is downloaded before page 1 renders.

**Expected Counterexamples**:
- `<Document>` mounted with no `options` (auto-fetch left enabled).
- Whole-file GET observed instead of `206 Partial Content` range responses.
- Possible causes: missing `options` prop (primary), forced high-DPI (secondary),
  missing S3 CORS `ExposeHeaders` (external dependency).

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed viewer
produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := renderPreview_fixed(input)
  ASSERT documentOptions(result).disableAutoFetch = TRUE
     AND documentOptions(result).disableStream = FALSE
     AND documentOptions(result).rangeChunkSize > 0
     AND renderDevicePixelRatio(result) = min(window.devicePixelRatio OR 1, 2)
END FOR
```

**Test Plan**: Render `PDFDocument` and assert the `<Document>` `options` prop equals
`PDF_OPTIONS` with the expected fields, and that the resolved `<Page>` `devicePixelRatio`
is capped at 2 for DPR ≥ 2 and equals the true ratio below 2. Verify option-identity
stability: re-render with unchanged `pdfUrl` and assert the same `options` reference
is passed (guards against reload loops). Manually confirm range requests
(`206 Partial Content`) appear in the network tab (and/or S3 access logs) once S3 CORS
exposes the range headers.

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed
viewer behaves identically to the original.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT renderPreview_original(input) = renderPreview_fixed(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation because
preservation is a universal claim over all non-buggy inputs; generated inputs catch
edge cases manual tests miss.

**Test Plan**: Observe behavior on the UNFIXED code for the preserved features, then
assert the same behavior holds after the fix.

**Test Cases**:
1. **Annotations preserved**: Create highlight/scribble/eraser annotations and verify
   create/render/persist behavior is unchanged (Req 3.1, 3.5).
2. **Text-layer selection preserved**: Verify text selection still works (Req 3.2).
3. **Zoom preserved**: Verify zoom in/out scales correctly across 0.6–2.5 (Req 3.3).
4. **On-demand page navigation preserved**: Verify prev/next/jump display the correct
   page, fetching per-page data on demand (Req 3.4).
5. **Dashboard & share-page loading preserved**: Verify both entry points load and
   render with all features (Req 3.6, 3.7).

### Unit Tests

- Assert `PDF_OPTIONS` has `disableAutoFetch: true`, `disableStream: false`,
  `rangeChunkSize: 65536`, and is a stable module-level reference.
- Assert `<Document>` is rendered with `options={PDF_OPTIONS}`.
- Assert the `<Page>` `devicePixelRatio` cap: `min(dpr || 1, 2)` for dpr values
  `0`, `1`, `2`, `3` (and SSR fallback `1`).

### Property-Based Tests

- For DPR values generated across `[0, 4]` (including `0`/`undefined`), assert the
  resolved `devicePixelRatio` is always `min(dpr || 1, 2)` and never exceeds 2.
- For repeated re-renders with unchanged `pdfUrl`, assert the `options` reference
  identity is stable (no new object created).

### Integration Tests

- Full viewer flow: open a large PDF, render page 1, navigate pages, zoom, annotate,
  revert — confirm no regressions.
- Manual before/after time-to-first-page measurement on the 239-page PDF over a
  throttled mobile connection; confirm range requests (`206 Partial Content`) in the
  network tab and/or S3 access logs once bucket CORS exposes the range headers.
- Graceful-fallback check: with S3 CORS *not* exposing range headers, confirm the
  viewer still loads correctly via a full download (no errors, just no speed-up).

## Edge Cases

- **S3 CORS not configured**: The browser cannot issue cross-origin Range requests;
  pdf.js falls back to a full download. The viewer still functions correctly — the
  performance gain simply does not apply until CORS `ExposeHeaders` is set (FIX 3).
- **Option-identity stability**: `PDF_OPTIONS` must be a module-level constant.
  Defining it inline (new object each render) would make react-pdf reload the
  document repeatedly, degrading performance and causing flicker.
- **`window.devicePixelRatio` undefined / zero (SSR or odd browsers)**: `|| 1`
  ensures a sane default, and the `typeof window` guard yields `1` under SSR.
  `PDFDocument` is also loaded with `ssr: false`, so the browser branch normally runs.
- **Small PDFs**: Range loading offers little benefit but causes no harm; behavior is
  effectively unchanged.
