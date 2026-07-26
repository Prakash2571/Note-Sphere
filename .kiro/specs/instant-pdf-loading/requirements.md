# Requirements Document

## Introduction

Note-Sphere renders note PDFs in a full-screen viewer (`PDFPreviewModal`) that
first fetches a short-lived S3 presigned URL from `GET /api/notes/[id]`, then
hands the URL to `PDFDocument`, which uses `react-pdf`'s `<Document file={{ url }}>`
with HTTP range loading (`disableAutoFetch`, `disableStream`,
`rangeChunkSize: 65536`). This gives a fast first page on the initial open but
still incurs a full network round trip (presigned URL request + range requests)
on **every** open — including repeat opens of the same document.

This feature makes opening a PDF feel near-instant, especially on repeat opens,
**without reducing render quality**. It adds a persistent client-side byte cache
(IndexedDB) keyed by note id, a non-blocking background prefetch of the full file
on first open, bounded LRU cache management, and a clearer in-page loading
placeholder. All existing viewer behaviors (annotations, zoom, fit-to-width,
undo/redo, eraser, revert, jump-to-page, mobile Back-to-close) must continue to
work identically whether the PDF is served from cache or the network.

Scope is intentionally limited to **client-side caching + background prefetch +
loading UI**. No server or infrastructure changes are required. Server-side
approaches (PDF linearization / "Fast Web View", server-rendered page previews)
are explicitly out of scope and documented as future work.

## Glossary

- **Viewer**: The client-side PDF viewing subsystem, comprising `PDFPreviewModal`
  and `PDFDocument`, that loads and renders a note's PDF.
- **PDF_Cache**: The persistent client-side byte store (IndexedDB) that holds
  full PDF file bytes keyed by a stable note identifier, plus per-entry metadata
  (byte size, last-access timestamp).
- **Cache_Key**: The stable identifier used to store and look up a cached PDF;
  the note id (`note._id`).
- **Cached_Bytes**: The complete PDF file bytes for a note previously stored in
  the PDF_Cache.
- **Network_Load_Path**: The existing loading mechanism — request a presigned URL
  from `GET /api/notes/[id]`, then render via `react-pdf` with HTTP range loading
  (`disableAutoFetch`, `disableStream`, `rangeChunkSize: 65536`).
- **Background_Prefetch**: A deferred, non-blocking download of the complete PDF
  file bytes performed after the visible first page has begun rendering, whose
  result is written to the PDF_Cache.
- **Render_Settings**: The rendering configuration used by `PDFDocument` —
  dynamic supersampling device pixel ratio (`renderDpr`), text layer
  (`renderTextLayer`), annotation layer, fit-to-width sizing, and `PDF_OPTIONS`.
- **Cache_Budget**: The maximum total number of bytes the PDF_Cache is permitted
  to occupy across all entries.
- **LRU_Eviction**: Removal of the least-recently-accessed cache entries when the
  PDF_Cache would otherwise exceed the Cache_Budget.
- **First_Page_Render**: The moment the first visible PDF page has finished
  rendering to canvas in the Viewer.
- **Loading_Placeholder**: A visible skeleton or spinner shown in the page area
  while First_Page_Render has not yet occurred.
- **Error_State**: A visible message shown in the page area when loading or
  rendering fails.

## Requirements

### Requirement 1: Persistent client-side PDF byte cache (instant repeat open)

**User Story:** As a note owner reopening a PDF I have viewed before, I want it
to appear instantly, so that I do not wait for a network download every time.

#### Acceptance Criteria

1. WHEN a note's PDF is opened, THE Viewer SHALL query the PDF_Cache using the
   Cache_Key derived from the note id before initiating any network request.
2. IF the PDF_Cache contains Cached_Bytes for the Cache_Key, THEN THE Viewer
   SHALL render the PDF from the Cached_Bytes without issuing any network
   download for the PDF file bytes or the presigned URL.
3. WHEN Cached_Bytes are read for a Cache_Key, THE PDF_Cache SHALL update the
   last-access timestamp for that entry.
4. IF a PDF_Cache read, write, or open operation throws an error or the
   environment does not support IndexedDB, THEN THE Viewer SHALL fall back to the
   Network_Load_Path and SHALL render the PDF.
5. THE Viewer SHALL execute all PDF_Cache operations without blocking the render
   of the PDF for longer than 1 second before falling back to the
   Network_Load_Path.

### Requirement 2: First-open behavior and non-blocking background prefetch

**User Story:** As a note owner opening a PDF for the first time, I want the first
page to appear as fast as it does today while the full file is cached in the
background, so that my next open is instant.

#### Acceptance Criteria

1. IF the PDF_Cache does not contain Cached_Bytes for the Cache_Key, THEN THE
   Viewer SHALL load the PDF using the Network_Load_Path.
2. WHEN the Viewer loads a PDF via the Network_Load_Path, THE Viewer SHALL initiate
   a Background_Prefetch of the complete PDF file bytes.
3. WHEN a Background_Prefetch completes successfully, THE Viewer SHALL store the
   downloaded bytes in the PDF_Cache keyed by the Cache_Key.
4. THE Viewer SHALL defer the Background_Prefetch until after First_Page_Render has
   begun so that the Background_Prefetch does not delay First_Page_Render.
5. IF a Background_Prefetch fails, THEN THE Viewer SHALL leave the PDF_Cache
   unchanged and SHALL continue rendering via the Network_Load_Path.
6. WHILE a Background_Prefetch is in progress, THE Viewer SHALL keep the rendered
   page interactive.

### Requirement 3: Bounded cache size with LRU eviction

**User Story:** As a user with limited device storage, I want the PDF cache to
stay within a fixed size, so that cached PDFs do not consume unbounded storage.

#### Acceptance Criteria

1. THE PDF_Cache SHALL enforce a configured Cache_Budget expressed as a maximum
   total number of bytes across all entries.
2. WHEN storing new Cached_Bytes would cause the total stored bytes to exceed the
   Cache_Budget, THE PDF_Cache SHALL apply LRU_Eviction, removing entries in order
   of oldest last-access timestamp first, until the total stored bytes are less
   than or equal to the Cache_Budget.
3. IF a single PDF file's byte size exceeds the Cache_Budget, THEN THE PDF_Cache
   SHALL decline to store that file and SHALL leave existing entries unchanged.
4. WHEN LRU_Eviction removes an entry, THE PDF_Cache SHALL remove both the entry's
   bytes and the entry's metadata.

### Requirement 4: Render quality preserved

**User Story:** As a note owner, I want cached PDFs to look exactly as sharp as
network-loaded PDFs, so that caching never degrades what I see.

#### Acceptance Criteria

1. WHERE a PDF is rendered from Cached_Bytes, THE Viewer SHALL apply the same
   Render_Settings used for the Network_Load_Path, including the dynamic
   supersampling device pixel ratio computation (`renderDpr`).
2. WHERE a PDF is rendered from Cached_Bytes, THE Viewer SHALL render the text
   layer using the same `renderTextLayer` configuration used for the
   Network_Load_Path.
3. WHERE a PDF is rendered from Cached_Bytes, THE Viewer SHALL apply the same
   fit-to-width page sizing computation used for the Network_Load_Path for a given
   container width and scale.

### Requirement 5: Loading placeholder and feedback

**User Story:** As a user opening a PDF, I want a clear loading indicator instead
of a blank area, so that I know the document is loading and when it fails.

#### Acceptance Criteria

1. WHILE First_Page_Render has not yet occurred, THE Viewer SHALL display a
   Loading_Placeholder in the page area instead of an empty white box.
2. WHEN First_Page_Render occurs, THE Viewer SHALL remove the Loading_Placeholder.
3. IF loading or rendering the PDF fails, THEN THE Viewer SHALL replace the
   Loading_Placeholder with an Error_State that describes the failure.
4. WHILE rendering from Cached_Bytes, THE Viewer SHALL display the
   Loading_Placeholder until First_Page_Render occurs.

### Requirement 6: Cache correctness and behavioral consistency

**User Story:** As a note owner, I want a cache hit to always show the correct
document with all viewer features working, so that caching is invisible to me
except for the speed.

#### Acceptance Criteria

1. WHEN the Viewer renders from Cached_Bytes, THE Viewer SHALL render the bytes
   stored under the Cache_Key for the note currently being viewed.
2. THE PDF_Cache SHALL associate each stored entry with exactly one Cache_Key so
   that a read for one Cache_Key never returns bytes stored under a different
   Cache_Key.
3. WHERE a PDF is loaded from Cached_Bytes, THE Viewer SHALL support annotation
   creation (highlight and scribble), zoom, fit-to-width, undo, redo, eraser,
   revert-all, and jump-to-page identically to a PDF loaded via the
   Network_Load_Path.
4. WHERE a PDF is loaded from Cached_Bytes on a mobile device, THE Viewer SHALL
   close on the hardware or browser Back action identically to a PDF loaded via
   the Network_Load_Path.

### Requirement 7: Documented non-goals and limits

**User Story:** As a maintainer, I want the known limits of this feature recorded,
so that expectations are clear and future work is identified.

#### Acceptance Criteria

1. THE requirements SHALL document that first-open speed over a slow network
   connection remains bounded by available bandwidth and is not improved by this
   feature.
2. THE requirements SHALL document that PDF linearization ("Fast Web View") and
   server-rendered page previews are out of scope for this feature.
3. THE requirements SHALL document that the out-of-scope server-side approaches
   are deferred as future work because they require server-side tooling not
   available in the current serverless deployment.

## Non-Goals (Out of Scope)

- **Server-side changes**: This feature requires no changes to `GET /api/notes/[id]`,
  `lib/s3.ts`, the S3 bucket, or any serverless function. The presigned-URL +
  HTTP range loading path is retained unchanged for first opens.
- **Faster first-open over slow connections**: First-open latency remains
  bandwidth-bound; caching only accelerates repeat opens.
- **PDF linearization / "Fast Web View"**: Reordering PDF bytes so the first page
  can render before the whole file downloads would require server-side tooling and
  is deferred to future work.
- **Server-rendered page previews**: Pre-rendering page images on the server for a
  faster perceived first paint would require server-side rendering infrastructure
  not available in the current serverless deployment and is deferred to future work.
