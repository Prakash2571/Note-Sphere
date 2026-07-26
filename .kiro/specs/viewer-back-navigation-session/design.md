# Viewer Back Navigation & Session Persistence Bugfix Design

## Overview

This bugfix addresses two independent defects reported by mobile users of Note-Sphere:

- **Bug 1 — Back button leaves the app.** The PDF viewer (`components/modals/PDFPreviewModal.tsx`) is a state-driven, full-screen overlay (`fixed inset-0 z-50`) opened via Redux UI state (`openPreview` / `previewNoteId` in `NotesList.tsx`) or via local `useState` on the public share pages. Because it is not a router route, opening it creates **no browser history entry**. Pressing the mobile/hardware Back button therefore pops the real history stack — which still holds the Google OAuth / sign-in pages from login — sending the user out of the app instead of just closing the overlay. The fix introduces a small reusable client hook (`components/modals/useHistoryBackClose.ts`) that pushes a synthetic history entry when the viewer opens and maps a `popstate` (Back) event to `onClose`, so the overlay "owns" a history entry and Back closes it while staying in-app.

- **Bug 2 — Session does not reliably persist.** In `lib/auth.ts` (Auth.js v5), `session.strategy` is `"jwt"` with `session.maxAge` of 30 days but **no matching `jwt.maxAge`**, and `AUTH_SECRET` is not documented as a deployment requirement. Without a stable `AUTH_SECRET`, JWTs are re-signed with an ephemeral secret on redeploy / cold start and invalidated early. The fix aligns `session.maxAge` and `jwt.maxAge` to 2 days and documents `AUTH_SECRET` (plus other referenced env vars) in the README and a new `.env.example`.

The two fixes are isolated: the viewer fix is purely client-side navigation handling; the session fix is auth configuration and documentation. Neither touches shared business logic.

## Glossary

- **Bug_Condition (C)**: The condition that triggers a bug. For Bug 1: the viewer overlay is open, Back is pressed, and the overlay has no history entry of its own. For Bug 2: elapsed time since login is under 2 days but the session is invalidated (misaligned token lifetime and/or unstable `AUTH_SECRET`).
- **Property (P)**: The desired behavior for buggy inputs. Bug 1: Back closes the overlay and stays in-app. Bug 2: the session remains valid for the full ~2-day window.
- **Preservation**: Existing behavior for non-buggy inputs that must remain identical (X-button close, other modals, normal route Back/Forward, all sign-in flows and callbacks).
- **`PDFPreviewModal`**: The full-screen PDF viewer overlay in `components/modals/PDFPreviewModal.tsx`. Receives `note`, `onClose`, and optional `presignedUrl` props; renders an X button wired to `onClose`.
- **`useHistoryBackClose`**: The new hook in `components/modals/useHistoryBackClose.ts` that ties an active overlay to a browser history entry so Back triggers close.
- **`onClose`**: The existing close handler passed to the viewer — `closePreview` (Redux) in `NotesList.tsx`, `() => setShowPdf(false)` in `app/shared/[token]/page.tsx`, and `() => setPreviewNote(null)` in `app/shared/collection/[token]/page.tsx`.
- **`session.maxAge` / `jwt.maxAge`**: Auth.js v5 lifetime settings in `lib/auth.ts` controlling session and underlying JWT expiry.
- **`AUTH_SECRET`**: Environment variable Auth.js v5 uses to sign/encrypt JWTs. Must be stable across deploys for tokens to survive.

## Bug Details

### Bug Condition

**Bug 1 — Viewer Back navigation.** The bug manifests when the viewer overlay is open and the user presses the browser/hardware Back button while the overlay is not registered as its own history entry. The overlay is state-driven (not a route), so Back pops the real history stack (which may contain OAuth/sign-in pages) instead of closing the overlay.

**Formal Specification (Bug 1):**
```
FUNCTION isBugCondition_Viewer(input)
  INPUT: input = { viewerOpen: boolean, backPressed: boolean, overlayHasHistoryEntry: boolean }
  OUTPUT: boolean

  RETURN input.viewerOpen = TRUE
     AND input.backPressed = TRUE
     AND input.overlayHasHistoryEntry = FALSE
END FUNCTION
```

**Bug 2 — Session persistence.** The bug manifests when an authenticated session becomes invalid before its intended 2-day lifetime, because the JWT lifetime is misaligned with the session lifetime and/or `AUTH_SECRET` is unstable across redeploys/cold starts.

**Formal Specification (Bug 2):**
```
FUNCTION isBugCondition_Session(input)
  INPUT: input = { elapsedSinceLogin: duration, authSecretStable: boolean, redeployOccurred: boolean }
  OUTPUT: boolean

  RETURN input.elapsedSinceLogin < 2_DAYS
     AND ( input.authSecretStable = FALSE OR jwtMaxAgeMisaligned() )
     AND sessionInvalidated(input)
END FUNCTION
```

### Examples

- **Bug 1:** User signs in via Google → lands on dashboard → opens a PDF in the viewer → presses Back. *Expected:* viewer closes, user stays on dashboard. *Actual:* browser navigates back to the Google accounts login page.
- **Bug 1:** On a public share page (`/shared/[token]`), user taps "Preview PDF" then presses Back. *Expected:* preview closes, share page remains. *Actual:* browser leaves the share page entirely.
- **Bug 2:** User logs in, returns after a few hours (well under 2 days) following an app redeploy. *Expected:* still logged in. *Actual:* redirected to the sign-in page because the JWT was re-signed with an ephemeral secret.
- **Edge case (Bug 1):** User closes the viewer via the X button (not Back). *Expected:* viewer closes and the synthetic history entry is cleaned up so a later Back does not leave a dangling no-op entry.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Clicking the close (X) button in the viewer continues to close it via the existing `onClose` handler in all three call sites.
- All existing viewer features (zoom, page navigation, annotation toolbar, PDF loading via presigned URL, Escape/error states) continue to work unchanged.
- Other modals/overlays (`ShareModal`, `SummarizePanel`, `UploadModal`, `MultiShareModal`) behave exactly as before — they do not adopt history handling.
- Credentials and Google sign-in continue to authenticate using the existing `signIn`, `jwt`, and `session` callbacks with no change to user upsert logic or `session.user.id` exposure.
- Normal in-app route Back/Forward navigation (viewer not open) continues to behave as standard browser navigation.

**Scope:**
All inputs that do NOT satisfy a bug condition must be completely unaffected:
- X-button closes, other modals, and normal route navigation (Bug 1 non-triggers).
- Sessions that expire correctly after 2 days, and successful sign-ins within the window (Bug 2 non-triggers).

_The expected correct behavior for buggy inputs is defined in the Correctness Properties section (Property 1 and Property 3)._

## Hypothesized Root Cause

**Bug 1 — Viewer Back navigation:**

1. **Overlay is not a route and owns no history entry.** The viewer opens purely from Redux/`useState`, so no `pushState`/route push occurs. Back therefore acts on the real history stack.
2. **Residual OAuth/sign-in history.** After the Google login flow, the browser history still contains the OAuth/sign-in pages, so the first Back lands there instead of a benign app page.
3. **No `popstate` interception.** Nothing listens for Back while the overlay is open, so there is no opportunity to translate Back into "close overlay."

**Bug 2 — Session persistence:**

1. **Misaligned token lifetime.** `session.maxAge` is 30 days but there is no `jwt.maxAge`, so session and token lifetimes are not aligned to the intended duration.
2. **Unstable signing secret.** If `AUTH_SECRET` is unset, Auth.js v5 falls back to an ephemeral secret; redeploys/cold starts re-sign and invalidate existing JWTs before their intended expiry.
3. **Undocumented env requirements.** No README guidance or `.env.example` exists to ensure `AUTH_SECRET` (and related vars) are configured for durable sessions.

## Correctness Properties

Property 1: Bug Condition — Back Closes the Viewer

_For any_ input where the viewer bug condition holds (`isBugCondition_Viewer` returns true: viewer open, Back pressed, no history entry owned), the fixed viewer SHALL close the overlay by invoking the existing `onClose` handler and remain within the app, and SHALL NOT navigate to the Google OAuth / sign-in pages.

**Validates: Requirements 2.1, 2.2**

Property 2: Preservation — Non-Back Viewer & Navigation Behavior

_For any_ input where the viewer bug condition does NOT hold (X-button close, other modals, normal route Back/Forward with the viewer closed), the fixed code SHALL produce exactly the same result as the original code, preserving the existing `onClose` behavior, all viewer features, other modal behavior, and standard route navigation.

**Validates: Requirements 3.1, 3.2, 3.3, 3.6**

Property 3: Bug Condition — Session Persists ~2 Days

_For any_ input where the session bug condition holds (`isBugCondition_Session` returns true: elapsed time under 2 days with a stable `AUTH_SECRET`), the fixed auth configuration SHALL keep the session valid for the full ~2-day window by aligning `session.maxAge` and `jwt.maxAge` to `2 * 24 * 60 * 60` seconds while keeping `strategy: "jwt"`.

**Validates: Requirements 2.3, 2.4**

Property 4: Preservation — Existing Auth Flows Unchanged

_For any_ input where the session bug condition does NOT hold (successful credentials/Google sign-in, requests within the valid window, expiry after 2 days), the fixed auth configuration SHALL behave identically to the original for providers and callbacks, still exposing `session.user.id` and preserving Google user upsert.

**Validates: Requirements 3.4, 3.5**

## Fix Implementation

### Fix 1 — Back button closes the viewer (new hook)

**New file**: `components/modals/useHistoryBackClose.ts`

A client hook `useHistoryBackClose(active: boolean, onClose: () => void)` that ties the overlay's open state to a browser history entry.

Behavior:
1. **On activate (`active` becomes true):** push a synthetic history entry — `window.history.pushState({ __modal: true }, "")` — and register a `popstate` listener that invokes the latest `onClose`.
2. **On Back press (`popstate`):** the pushed entry is popped; the listener calls `onClose`, closing the overlay and keeping the user in the app. A guard flag ensures `onClose` is not called twice (once from Back and once from cleanup).
3. **On cleanup / `active` becomes false:** remove the `popstate` listener. If the overlay was closed by means other than Back (e.g. the X button calling the returned helper), the pushed entry must be balanced (see `closeWithHistory`).
4. **Returned helper `closeWithHistory()`:** calls `window.history.back()` so the X button pops the synthetic entry — triggering `popstate` → `onClose` — keeping history balanced and using a single close path. (Alternatively the X handler may call `window.history.back()` directly; documented for the integrator.)
5. **Duplicate-push guard:** a ref tracks whether an entry has already been pushed for the current active session so re-renders do not stack multiple entries.
6. **Stale-closure avoidance:** store the latest `onClose` in a ref (`onCloseRef`) and read from it inside the listener, so the listener always calls the current handler without needing to re-subscribe.
7. **SSR-safe:** guard all `window`/`history` access with `typeof window !== "undefined"`.

**Interface:**
```
FUNCTION useHistoryBackClose(active: boolean, onClose: () => void): { closeWithHistory: () => void }
```

**Hook logic (pseudocode):**
```
useHistoryBackClose(active, onClose):
  onCloseRef <- ref(onClose)          // keep latest handler
  pushedRef  <- ref(false)            // did we push an entry?
  closingRef <- ref(false)            // guard against double onClose

  effect [onClose]:
    onCloseRef.current <- onClose

  effect [active]:
    IF typeof window == "undefined": RETURN
    IF NOT active: RETURN

    IF NOT pushedRef.current:
      window.history.pushState({ __modal: true }, "")
      pushedRef.current <- true

    handlePopState():
      IF closingRef.current: RETURN
      closingRef.current <- true
      pushedRef.current  <- false
      onCloseRef.current()

    window.addEventListener("popstate", handlePopState)

    CLEANUP:
      window.removeEventListener("popstate", handlePopState)
      // if unmounted/deactivated without a Back pop, balance the entry
      IF pushedRef.current AND NOT closingRef.current:
        pushedRef.current <- false
        window.history.back()   // silently pop the synthetic entry
      closingRef.current <- false

  closeWithHistory():
    IF typeof window != "undefined" AND pushedRef.current:
      window.history.back()     // triggers popstate -> onClose
    ELSE:
      onCloseRef.current()

  RETURN { closeWithHistory }
```

**`PDFPreviewModal` integration** (`components/modals/PDFPreviewModal.tsx`):
1. Call the hook near the top of the component: `const { closeWithHistory } = useHistoryBackClose(true, onClose);` — the modal only mounts when open, so `active` is effectively always `true` for its lifetime.
2. Change the X button handler from `onClick={onClose}` to `onClick={closeWithHistory}` (or `onClick={() => window.history.back()}`), so closing via X pops the synthetic entry and routes through the same `popstate` → `onClose` path, keeping history balanced.
3. Preserve all existing behavior: annotation toolbar, zoom, page navigation, PDF loading, error/loading states, and any Escape handling remain untouched.

**Why this fixes C(X):** Once the overlay owns a pushed history entry, the browser's Back maps to popping *that* entry, which the `popstate` listener translates into `onClose`. The real history stack (including OAuth/sign-in pages) is never reached, so the user stays in the app. This makes `overlayHasHistoryEntry = TRUE`, so `isBugCondition_Viewer` no longer holds.

**Call sites unchanged in contract:** `NotesList.tsx`, `app/shared/[token]/page.tsx`, and `app/shared/collection/[token]/page.tsx` continue to pass their existing `onClose` handlers; no call-site changes are required because the hook lives inside `PDFPreviewModal`.

### Fix 2 — Session persists 2 days

**File**: `lib/auth.ts`

**Specific changes:**
1. **Align session lifetime:** set `session.maxAge = 2 * 24 * 60 * 60` (2 days), keeping `strategy: "jwt"`.
2. **Add JWT lifetime:** add a top-level `jwt: { maxAge: 2 * 24 * 60 * 60 }` block so the token lifetime matches the session lifetime.
3. **No other changes:** providers (`Google`, `Credentials`) and callbacks (`signIn`, `jwt`, `session`) remain exactly as they are.

```
session: { strategy: "jwt", maxAge: 2 * 24 * 60 * 60 },
jwt:     { maxAge: 2 * 24 * 60 * 60 },
```

**Documentation** (`README.md` + new `.env.example`):
1. Document that `AUTH_SECRET` MUST be set to a stable value in every environment so JWTs survive redeploys/cold starts.
2. Add a `.env.example` with placeholder values for the environment variables the app references:
   - `AUTH_SECRET` — stable secret for signing/encrypting JWTs
   - `AUTH_GOOGLE_ID` — Google OAuth client id (read by Auth.js v5)
   - `AUTH_GOOGLE_SECRET` — Google OAuth client secret
   - `MONGODB_URI` — MongoDB connection string (used by `lib/mongodb.ts` / `connectDB`)
   - plus any other referenced deployment vars (e.g. S3/storage and AI/summarize keys) as placeholders

## Testing Strategy

### Validation Approach

Two-phase approach: first surface counterexamples that demonstrate each bug on the unfixed code, then verify the fix works for buggy inputs (fix checking) and leaves non-buggy inputs unchanged (preservation checking).

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bugs BEFORE implementing the fix, confirming or refuting the root-cause analysis.

**Test Plan (Bug 1)**: In a jsdom/component test, render `PDFPreviewModal`, then dispatch a `window` `popstate` event to simulate Back. On the UNFIXED code there is no listener, so `onClose` is never called.

**Test Cases**:
1. **Dashboard viewer Back** — render viewer with a spy `onClose`, dispatch `popstate`, assert `onClose` NOT called (fails/absent on unfixed code).
2. **Share page viewer Back** — same simulation for the share-page usage.
3. **Session config inspection** — read `lib/auth.ts`; observe `session.maxAge = 30 days` and no `jwt.maxAge` (root cause of Bug 2).
4. **Edge — X button then Back** — close via X, then dispatch `popstate`; observe unbalanced history on unfixed code.

**Expected Counterexamples**:
- No `popstate` handler exists, so Back is not intercepted → user leaves the app.
- Possible causes: overlay owns no history entry; residual OAuth history; no interception.

### Fix Checking

**Goal**: Verify that for all inputs where a bug condition holds, the fixed code produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition_Viewer(input) DO
  result := PDFPreviewModal_fixed(input)   // Back pressed while open
  ASSERT overlayClosed(result) AND stillInApp(result) AND NOT navigatedToGoogleLogin(result)
END FOR

FOR ALL input WHERE isBugCondition_Session(input) DO
  ASSERT sessionValid(authConfig_fixed) WHEN input.elapsedSinceLogin < 2_DAYS
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed code produces the same result as the original.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition_Viewer(input) DO
  ASSERT PDFPreviewModal_original(input) = PDFPreviewModal_fixed(input)   // X close, other modals, normal route Back
END FOR

FOR ALL input WHERE NOT isBugCondition_Session(input) DO
  ASSERT authConfig_original(input) = authConfig_fixed(input)   // sign-in flows, callbacks, expiry after 2 days
END FOR
```

**Testing Approach**: Property-based testing is recommended for the viewer preservation checks because it can generate many open/close/Back/Forward sequences and confirm behavior is stable across them; catches edge cases manual tests miss.

**Test Plan**: Observe unfixed behavior for X-button close, other modals, and normal route Back first, then write tests capturing that behavior and assert it is unchanged after the fix.

**Test Cases**:
1. **X-button close preservation** — clicking X still invokes `onClose` (via `closeWithHistory`) and closes the overlay; history stays balanced.
2. **Other-modal preservation** — `ShareModal`/`SummarizePanel`/`UploadModal` unaffected (no history handling added).
3. **Normal route Back preservation** — with the viewer closed, `popstate` behaves as standard navigation.
4. **Auth flow preservation** — credentials/Google sign-in and `session.user.id` exposure unchanged; verified by inspection and existing auth behavior.

### Unit Tests

- `useHistoryBackClose`: pushes exactly one history entry on activate; calls `onClose` once on `popstate`; removes the listener on cleanup; no double-close; SSR-safe (no throw when `window` is undefined).
- `PDFPreviewModal`: X button closes via `closeWithHistory`; Back (`popstate`) closes the overlay.
- `lib/auth.ts`: aligned `session.maxAge` and `jwt.maxAge` both equal `2 * 24 * 60 * 60`.

### Property-Based Tests

- Generate random sequences of open → (Back | X | Forward) and assert the overlay always ends closed with balanced history and no navigation away from the app.
- Generate random non-viewer navigation sequences and assert route behavior is unchanged.

### Integration Tests

- Full flow: sign in → open viewer → press Back → assert viewer closed and still in-app (not on Google login).
- Open viewer, close via X, then Back → assert no dangling no-op history entry.
- Session config verified by inspection: `session.maxAge` and `jwt.maxAge` are both 2 days and `AUTH_SECRET` is documented in README and `.env.example`.

### Notes on Verification Method

- **Bug 1** is verified by component tests using history/`popstate` mocks in jsdom (real hardware Back cannot be triggered in unit tests, but `popstate` is the same event the browser dispatches).
- **Bug 2** is verified primarily by inspection of the aligned `maxAge` values and the documented `AUTH_SECRET` requirement, since true expiry/redeploy behavior is environmental and not unit-testable.
