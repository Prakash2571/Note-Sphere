# Bugfix Requirements Document

## Introduction

This bugfix addresses two related session/navigation defects reported by mobile users of the Note-Sphere app.

**Bug 1 — Mobile Back button leaves the app / lands on Google login.**
While viewing a PDF in the viewer overlay (`components/modals/PDFPreviewModal.tsx`), pressing the mobile browser/hardware Back button navigates the user *away* from the app — often to the Google accounts login page — instead of simply closing the PDF viewer. The viewer is a state-driven, full-screen overlay (`fixed inset-0 z-50`) opened through Redux UI state (`openPreview` / `previewNoteId` in `components/dashboard/NotesList.tsx`, and also used in `app/shared/[token]/page.tsx` and `app/shared/collection/[token]/page.tsx`). Because it is not a router route, opening it creates no browser history entry. Pressing Back therefore pops the real browser history — which still contains the Google OAuth / sign-in pages from the login flow — sending the user to the Google login screen rather than closing the overlay.

**Bug 2 — Login session does not reliably persist.**
Users are unexpectedly sent back to the login page; the session does not clearly persist. In `lib/auth.ts` (Auth.js v5 / next-auth v5), `session.strategy` is `"jwt"` with `session.maxAge` set to 30 days, but there is no matching `jwt.maxAge`, and cookie persistence is not explicitly configured. Additionally, if `AUTH_SECRET` is not set in the deployment environment, JWTs are re-signed with an ephemeral secret and invalidated on redeploys / cold starts, forcing re-login. The desired behavior is a session that stays active for **2 days**.

The requirements below are expressed using the bug-condition methodology: **Current Behavior (Defect)** captures the buggy inputs, **Expected Behavior (Correct)** defines the fix for those same inputs, and **Unchanged Behavior (Regression Prevention)** protects the flows that already work.

## Bug Analysis

### Current Behavior (Defect)

*What currently happens when the bug is triggered.*

1.1 WHEN the PDF viewer overlay (`PDFPreviewModal`) is open AND the user presses the mobile browser/hardware Back button THEN the system navigates away from the app (popping real browser history) instead of closing the overlay.

1.2 WHEN the viewer is reached after the Google OAuth / sign-in flow AND the user presses Back to dismiss the viewer THEN the system throws the user to the Google accounts login page because the overlay created no history entry of its own.

1.3 WHEN an authenticated user's JWT session is created THEN the system applies `session.maxAge` (30 days) without a matching `jwt.maxAge`, so the underlying token lifetime is not aligned with the intended session lifetime.

1.4 WHEN the app is deployed without `AUTH_SECRET` set in the environment AND the app redeploys or a serverless instance cold-starts THEN the system re-signs JWTs with an ephemeral secret, invalidating existing tokens and forcing users back to the login page before their session should have expired.

### Expected Behavior (Correct)

*What should happen instead. Each clause corresponds to the defect clause with the same trigger condition.*

2.1 WHEN the PDF viewer overlay is open AND the user presses the mobile browser/hardware Back button THEN the system SHALL close the viewer overlay (invoking the existing `onClose` handler) and remain within the app instead of navigating away.

2.2 WHEN the viewer is opened THEN the system SHALL push a browser history entry (via `history.pushState`) and listen for `popstate` so that a Back press is intercepted and mapped to closing the overlay rather than popping to the Google OAuth / sign-in pages; the close (X) button SHALL trigger `history.back()` so the pushed history entry is cleaned up consistently. This behavior SHALL be implemented as a small reusable hook (e.g. `components/modals/useHistoryBackClose.ts`) consumed by `PDFPreviewModal`.

2.3 WHEN an authenticated user's JWT session is created THEN the system SHALL set both `session.maxAge` and `jwt.maxAge` to 2 days (`2 * 24 * 60 * 60` seconds) while keeping `session.strategy` as `"jwt"`, so the session and token lifetimes are aligned to approximately 2 days.

2.4 WHEN the app is deployed THEN the system SHALL require `AUTH_SECRET` to be set in the environment (documented in the README and, if present, an `.env` example) so that JWTs are signed with a stable secret and survive redeploys / cold starts, allowing sessions to persist for the intended 2-day lifetime.

### Unchanged Behavior (Regression Prevention)

*Existing behavior that must be preserved for inputs that do not trigger the bug.*

3.1 WHEN the user clicks the close (X) button inside the PDF viewer THEN the system SHALL CONTINUE TO close the viewer via the existing `onClose` handler (`closePreview` in `NotesList.tsx`, and the corresponding close handlers in `app/shared/[token]/page.tsx` and `app/shared/collection/[token]/page.tsx`).

3.2 WHEN the PDF viewer is open THEN the system SHALL CONTINUE TO support all existing viewer features (zoom, page navigation, annotation toolbar, PDF loading via presigned URL) without change.

3.3 WHEN other modals or overlays are used (e.g. `ShareModal`, `SummarizePanel`, `UploadModal`, `MultiShareModal`) THEN the system SHALL CONTINUE TO behave exactly as before, unaffected by the viewer's history handling.

3.4 WHEN a user signs in with valid credentials or with Google THEN the system SHALL CONTINUE TO authenticate successfully using the existing providers and callbacks (`signIn`, `jwt`, `session`) with no change to sign-in logic or user upsert behavior.

3.5 WHEN an authenticated user makes requests within the valid session window THEN the system SHALL CONTINUE TO keep the user logged in and expose `session.user.id` as before.

3.6 WHEN the user navigates the app normally without the viewer open THEN the system SHALL CONTINUE TO honor standard browser Back/Forward navigation between routes.

## Deriving the Bug Condition

### Bug 1 — Viewer Back navigation

```pascal
FUNCTION isBugCondition_Viewer(X)
  INPUT: X = { viewerOpen: boolean, backPressed: boolean, overlayHasHistoryEntry: boolean }
  OUTPUT: boolean

  // Bug triggers when the overlay is open, Back is pressed,
  // and the overlay is NOT registered as its own history entry.
  RETURN X.viewerOpen = TRUE
     AND X.backPressed = TRUE
     AND X.overlayHasHistoryEntry = FALSE
END FUNCTION
```

```pascal
// Property: Fix Checking — Back closes the viewer and stays in the app
FOR ALL X WHERE isBugCondition_Viewer(X) DO
  result <- F'(X)   // F' = viewer with useHistoryBackClose hook applied
  ASSERT overlay_closed(result) AND still_in_app(result) AND NOT navigated_to_google_login(result)
END FOR
```

```pascal
// Property: Preservation Checking — non-buggy navigation is unchanged
FOR ALL X WHERE NOT isBugCondition_Viewer(X) DO
  ASSERT F(X) = F'(X)   // X button close, other modals, normal route Back all behave identically
END FOR
```

### Bug 2 — Session persistence

```pascal
FUNCTION isBugCondition_Session(X)
  INPUT: X = { elapsedSinceLogin: duration, authSecretStable: boolean, redeployOccurred: boolean }
  OUTPUT: boolean

  // Bug triggers when a session becomes invalid before its intended 2-day lifetime.
  RETURN X.elapsedSinceLogin < 2_DAYS
     AND ( X.authSecretStable = FALSE OR jwt_maxAge_misaligned() )
     AND session_invalidated(X)
END FUNCTION
```

```pascal
// Property: Fix Checking — session persists for ~2 days
FOR ALL X WHERE isBugCondition_Session(X) DO
  result <- F'(X)   // F' = auth config with aligned 2-day session/jwt maxAge + stable AUTH_SECRET
  ASSERT session_valid(result) WHEN X.elapsedSinceLogin < 2_DAYS
END FOR
```

```pascal
// Property: Preservation Checking — existing auth flows unchanged
FOR ALL X WHERE NOT isBugCondition_Session(X) DO
  ASSERT F(X) = F'(X)   // sign-in with credentials/Google, callbacks, and expiry after 2 days unchanged
END FOR
```

**Key Definitions:**
- **F**: The original (unfixed) code — the viewer overlay without history handling and the auth config with a 30-day `session.maxAge` and no `jwt.maxAge`.
- **F'**: The fixed code — the viewer using `useHistoryBackClose` to intercept Back, and the auth config with aligned 2-day `session.maxAge` / `jwt.maxAge` plus a documented stable `AUTH_SECRET`.
