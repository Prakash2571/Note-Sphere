/**
 * lib/pdfCache.ts
 * IndexedDB-backed, best-effort PDF byte cache for the client-side Viewer.
 *
 * Design contract: every operation is wrapped in try/catch and is safe to call
 * in ANY environment (SSR, unsupported browser, quota exceeded, transaction
 * abort, structured-clone failure). No function ever rejects or throws to its
 * caller — reads resolve to `null` and writes resolve to a no-op. This
 * guarantees the cache can never break the presigned-URL + range-loading
 * Network_Load_Path fallback; caching is a pure enhancement layered on top.
 *
 * Bytes are stored keyed by `note._id` with copy-on-write / copy-on-read so the
 * stored buffer is always independent of any buffer pdf.js may later transfer
 * or detach to its worker. A fixed byte budget is enforced via LRU eviction.
 */

const DB_NAME = "notesphere-pdf-cache";
const DB_VERSION = 1;
const STORE = "pdfs"; // keyPath: "id" (noteId)

/** Maximum total bytes retained across all cache entries (150 MB). */
export const CACHE_BUDGET = 150 * 1024 * 1024;

/**
 * Shape of a single stored cache record. LRU metadata (`size`, `lastAccess`)
 * lives on the record itself so deleting a record removes the bytes and its
 * metadata atomically.
 */
export interface PdfCacheRecord {
  id: string; // Cache_Key = note._id
  bytes: ArrayBuffer; // complete PDF file bytes (a copy)
  size: number; // bytes.byteLength (denormalized for eviction math)
  lastAccess: number; // Date.now() of last read/write (LRU ordering key)
}

/**
 * Module-level guard used by the modal to dedupe concurrent prefetches for the
 * same `noteId` (overlapping opens should not double-download/store).
 */
export const inFlightPrefetch = new Set<string>();

/**
 * Cached open promise so we do not reopen the database on every call.
 * Reset to `null` if opening fails, so a later call may retry.
 */
let dbPromise: Promise<IDBDatabase | null> | null = null;

/**
 * Promisify an IDBRequest into a Promise that resolves with its result or
 * rejects on error. Callers are responsible for wrapping in try/catch.
 */
function promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Lazily open the IndexedDB database. Returns `null` on SSR, when IndexedDB is
 * unsupported (`typeof indexedDB === "undefined"`), or on any error. The open
 * promise is memoized in a module variable to avoid reopening every call.
 */
export function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;

  dbPromise = (async (): Promise<IDBDatabase | null> => {
    try {
      if (typeof indexedDB === "undefined") return null;

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: "id" });
        }
      };

      return await promisifyRequest(request);
    } catch {
      // Reset so a future call may retry opening.
      dbPromise = null;
      return null;
    }
  })();

  return dbPromise;
}

/**
 * The single choke point for all store access. Opens the DB, creates a
 * transaction on STORE, runs `fn(store)`, and resolves with the function's
 * result once the transaction completes. Returns `null` on any error, abort, or
 * unsupported/SSR environment — never throws/rejects.
 */
async function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => Promise<T> | T
): Promise<T | null> {
  try {
    const db = await openDb();
    if (!db) return null;

    return await new Promise<T | null>((resolve) => {
      let result: T | null = null;
      try {
        const tx = db.transaction(STORE, mode);
        const store = tx.objectStore(STORE);

        tx.oncomplete = () => resolve(result);
        tx.onerror = () => resolve(null);
        tx.onabort = () => resolve(null);

        Promise.resolve(fn(store))
          .then((value) => {
            result = value;
          })
          .catch(() => {
            // Swallow: transaction handlers above resolve the outer promise.
            try {
              tx.abort();
            } catch {
              /* no-op */
            }
            resolve(null);
          });
      } catch {
        resolve(null);
      }
    });
  } catch {
    return null;
  }
}

/**
 * Best-effort update of a record's `lastAccess` timestamp in its own readwrite
 * transaction. Failure to update must not fail the originating read.
 */
async function touchLastAccess(noteId: string): Promise<void> {
  await withStore("readwrite", async (store) => {
    const record = (await promisifyRequest(
      store.get(noteId)
    )) as PdfCacheRecord | undefined;
    if (!record) return;
    record.lastAccess = Date.now();
    await promisifyRequest(store.put(record));
  });
}

/**
 * Read cached PDF bytes for a note.
 *
 * On hit, returns a COPY of the stored bytes (`bytes.slice(0)`) — never the
 * stored buffer instance — and best-effort refreshes the record's `lastAccess`.
 * Returns `null` on miss or any error.
 */
export async function getCachedPdf(noteId: string): Promise<ArrayBuffer | null> {
  // Individual public share pages do not expose a note ID. Never reuse the
  // empty key across different shared documents, including old cache entries.
  if (!noteId) return null;
  try {
    const bytes = await withStore("readonly", async (store) => {
      const record = (await promisifyRequest(
        store.get(noteId)
      )) as PdfCacheRecord | undefined;
      if (!record || !record.bytes) return null;
      // Copy-on-read: hand out a detached-safe copy, never the stored buffer.
      return record.bytes.slice(0);
    });

    if (!bytes) return null;

    // Best-effort LRU refresh; a failure here must not fail the read.
    void touchLastAccess(noteId);

    return bytes;
  } catch {
    return null;
  }
}

/**
 * Enforce CACHE_BUDGET via LRU eviction. Reads every record's `{id, size,
 * lastAccess}` via a cursor, and while the projected total exceeds the budget,
 * deletes the entry with the oldest `lastAccess` first. Assumes the incoming
 * record (if any) has already been written to `store`.
 */
async function evictToBudget(store: IDBObjectStore): Promise<void> {
  const entries: Array<{ id: string; size: number; lastAccess: number }> = [];

  await new Promise<void>((resolve, reject) => {
    const cursorRequest = store.openCursor();
    cursorRequest.onsuccess = () => {
      const cursor = cursorRequest.result;
      if (cursor) {
        const record = cursor.value as PdfCacheRecord;
        entries.push({
          id: record.id,
          size: record.size,
          lastAccess: record.lastAccess,
        });
        cursor.continue();
      } else {
        resolve();
      }
    };
    cursorRequest.onerror = () => reject(cursorRequest.error);
  });

  let total = entries.reduce((sum, entry) => sum + entry.size, 0);
  if (total <= CACHE_BUDGET) return;

  // Oldest last-access first.
  entries.sort((a, b) => a.lastAccess - b.lastAccess);

  for (const entry of entries) {
    if (total <= CACHE_BUDGET) break;
    await promisifyRequest(store.delete(entry.id));
    total -= entry.size;
  }
}

/**
 * Store PDF bytes for a note (overwrite by key; idempotent).
 *
 * - No-op for empty/absent buffers.
 * - Skips storing a single file larger than CACHE_BUDGET (leaves existing
 *   entries unchanged).
 * - Stores a COPY (`bytes.slice(0)`) so the caller's buffer is never retained.
 * - Enforces CACHE_BUDGET via LRU eviction after writing.
 *
 * Swallows all errors and resolves to a no-op on failure.
 */
export async function putCachedPdf(
  noteId: string,
  bytes: ArrayBuffer
): Promise<void> {
  if (!noteId) return;
  try {
    if (!bytes || bytes.byteLength === 0) return;
    // A single file larger than the whole budget is never stored (Req 3.3).
    if (bytes.byteLength > CACHE_BUDGET) return;

    // Copy-on-write: never retain/alias the caller's buffer.
    const copy = bytes.slice(0);
    const record: PdfCacheRecord = {
      id: noteId,
      bytes: copy,
      size: copy.byteLength,
      lastAccess: Date.now(),
    };

    await withStore("readwrite", async (store) => {
      await promisifyRequest(store.put(record));
      await evictToBudget(store);
    });
  } catch {
    // Best-effort: leave existing entries valid.
  }
}
