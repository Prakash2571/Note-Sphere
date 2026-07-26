# Implementation Plan: instant-pdf-loading

## Overview

Implement a persistent client-side PDF byte cache (IndexedDB), a non-blocking
background prefetch, and a loading skeleton for the existing `PDFPreviewModal` /
`PDFDocument` Viewer. Work proceeds bottom-up: first the best-effort cache module
(`lib/pdfCache.ts`), then the source-independent `PDFDocument` render path, then
the cache-first + prefetch + skeleton wiring in `PDFPreviewModal`, ending with a
build/type-check and manual verification checkpoint. The existing presigned-URL +
range-loading Network_Load_Path remains the guaranteed fallback throughout.

## Tasks

- [ ] 1. Create `lib/pdfCache.ts` — best-effort IndexedDB PDF byte cache
  - Create `lib/pdfCache.ts` (client-only). Define constants `DB_NAME = "notesphere-pdf-cache"`, `DB_VERSION = 1`, `STORE = "pdfs"` (keyPath `"id"`), and export `CACHE_BUDGET = 150 * 1024 * 1024`.
  - Export `PdfCacheRecord` interface (`id`, `bytes: ArrayBuffer`, `size`, `lastAccess`).
  - Implement `openDb()`: return `null` on SSR/unsupported (`typeof indexedDB === "undefined"`) or any error; create the `pdfs` object store with `keyPath: "id"` on upgrade.
  - Implement `getCachedPdf(noteId)`: copy-on-read (`bytes.slice(0)`), refresh `lastAccess` best-effort, return `null` on miss/error.
  - Implement `putCachedPdf(noteId, bytes)`: copy-on-write (`bytes.slice(0)`), enforce `CACHE_BUDGET` via LRU eviction (oldest `lastAccess` first, remove bytes + metadata together), skip storing if a single file exceeds `CACHE_BUDGET`, overwrite by key (idempotent).
  - Add internal `withStore(mode, fn)` choke point and `evictToBudget(store, incomingSize)` helper; wrap every IndexedDB interaction in `try/catch` so reads resolve `null` and writes no-op — never throw/reject.
  - Add module-level `inFlightPrefetch: Set<string>` guard to dedupe concurrent prefetches for the same `noteId`.
  - _Requirements: 1.2, 1.3, 1.4, 2.3, 3.1, 3.2, 3.3, 3.4, 6.1, 6.2_

  - [ ]* 1.1 Write property tests for `lib/pdfCache.ts` (fast-check + fake-indexeddb, >=100 iterations each)
    - **Property 1: Put/get round-trip with key association** — **Validates: Requirements 2.3, 6.1, 6.2**
    - **Property 2: Copy-on-read/write prevents shared-buffer detachment** — **Validates: Requirements 1.2, 2.3**
    - **Property 3: Cache stays within budget** — **Validates: Requirements 3.1, 3.3**
    - **Property 4: LRU eviction removes oldest-accessed first** — **Validates: Requirements 3.2, 3.4**
    - **Property 5: Reading refreshes last-access** — **Validates: Requirements 1.3**
    - **Property 6: Cache operations are best-effort and never break the URL fallback** — **Validates: Requirements 1.4**
    - Tag each test: **Feature: instant-pdf-loading, Property {n}: {text}**

  - [ ]* 1.2 Write unit tests for `lib/pdfCache.ts` edge cases
    - Single file exactly at / just over `CACHE_BUDGET`; empty-store read → `null`; overwrite same key updates bytes and `size`; concurrent prefetch-guard dedup.
    - _Requirements: 3.3_

- [ ] 2. Update `PDFDocument.tsx` for source-independent rendering
  - Make `pdfUrl` optional; add `pdfData?: Uint8Array` and `onFirstRender?: () => void` props (all optional so existing callers are unaffected).
  - Add `const file = useMemo(() => (pdfData ? { data: pdfData } : pdfUrl ? { url: pdfUrl } : null), [pdfData, pdfUrl])` for stable `react-pdf` `file` identity.
  - Add a render guard: when `file` is `null`, return `null` (modal shows skeleton/spinner instead).
  - Call `onFirstRender()` from the page `onRenderSuccess` handler **after** reporting `onPageDimensions`, so the modal hides the skeleton exactly when the first page paints.
  - Treat `pdfData` as owned by pdf.js once passed (detached-buffer safety); keep `PDF_OPTIONS`, `renderDpr`/`deviceDpr`/`QUALITY` supersampling, `pageWidth`/`fitWidth`/`overlayScale` fit-to-width math, `renderTextLayer`, annotation overlay, and worker setup unchanged.
  - _Requirements: 4.1, 4.2, 4.3, 5.1, 5.2, 6.3_

  - [ ]* 2.1 Write component test for source-independent render settings (react-pdf mocked)
    - **Property 7: Render settings are source-independent** — **Validates: Requirements 4.1, 4.3**
    - Render with `pdfData` and with `pdfUrl` for the same `(containerWidth, scale, dims)`; assert identical `pageWidth`/`renderDpr`/`renderTextLayer` reach `<Page>`.

- [ ] 3. Update `PDFPreviewModal.tsx` — cache-first open, prefetch, skeleton
  - Add state: `pdfBytes: Uint8Array | null`, `firstPageRendered: boolean`, and `prefetchedRef` (runs once).
  - Cache-first open effect (keyed by `note._id`): `await getCachedPdf(note._id)`; on hit `setPdfBytes(new Uint8Array(cached))` (fresh copy) and skip the presigned-URL fetch entirely; on miss/error fall back to the existing `/api/notes/[id]` presigned-URL fetch (and `externalUrl` short-circuit). Reset `firstPageRendered`/`prefetchedRef` per note; cancel on unmount.
  - Background prefetch `maybePrefetch()` triggered once from `onDocumentLoadSuccess` (URL loads only, skip when `pdfBytes` set): `fetch(src).then(r => r.arrayBuffer())` → `putCachedPdf(note._id, buf)`, guarded so failure is non-fatal.
  - Pass `pdfData={pdfBytes ?? undefined}`, `pdfUrl={pdfUrl ?? undefined}`, and `onFirstRender={() => setFirstPageRendered(true)}` to `PDFDocument`.
  - Add a loading skeleton sized to the page area shown while `!firstPageRendered && !error` (replacing the blank white box); preserve the existing spinner/Error_State.
  - Change annotation-toolbar gating from `pdfUrl && !error` to `(pdfUrl || pdfBytes) && !error`.
  - _Requirements: 1.1, 1.2, 1.4, 1.5, 2.1, 2.2, 2.4, 2.5, 2.6, 5.1, 5.2, 5.3, 5.4, 6.1, 6.4_

  - [ ]* 3.1 Write component tests for modal behavior (react-pdf mocked)
    - Cache hit skips `/api/notes` fetch and passes `pdfData` (Req 1.1, 1.2).
    - Cache miss → URL render → `onFirstRender` → prefetch `fetch` + `putCachedPdf` called once (Req 2.1–2.4).
    - Prefetch failure non-fatal: no `putCachedPdf`, no Error_State, URL render intact (Req 2.5).
    - Cache error → URL fallback renders (Req 1.4).
    - Skeleton lifecycle: skeleton until `onFirstRender` for both sources; removed after; Error_State on `onLoadError` (Req 5.1–5.4).
    - **Property 8: Loading placeholder shown until first render for both sources** — **Validates: Requirements 5.4, 5.1, 5.2**
    - Feature parity on cache render: annotation overlay mounts and back-to-close works (Req 6.3, 6.4).

- [ ] 4. Final checkpoint — build, type-check, and manual verification
  - Run the project build/type-check and ensure all tests pass; ask the user if questions arise.
  - Manual verification: a second open of a PDF is instant (works offline after first open); the first page shows a skeleton then content; render quality is unchanged from the network path.

## Notes

- Tasks marked with `*` are optional (tests) and can be skipped for a faster MVP.
- Each task references specific requirements for traceability; test sub-tasks reference the correctness properties they validate.
- Property tests use fast-check + fake-indexeddb at >=100 iterations and are tagged **Feature: instant-pdf-loading, Property {n}: {text}**.
- The presigned-URL + range-loading Network_Load_Path remains the guaranteed fallback; caching is a pure enhancement.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["1.1", "1.2", "2"] },
    { "id": 2, "tasks": ["2.1", "3"] },
    { "id": 3, "tasks": ["3.1"] }
  ]
}
```
