# Implementation Plan

Tasks marked with `*` are optional (tests). Exploration (Property 1) and preservation (Property 2) tests are written BEFORE the fix; fix-checking and preservation-checking sub-tasks re-run those same tests after the fix.

- [ ]* 1. Write bug condition exploration test for viewer Back navigation
  - **Property 1: Bug Condition** - Back Closes the Viewer
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples showing Back is not intercepted by the viewer overlay
  - **Scoped PBT Approach**: Scope the property to the concrete failing case: viewer open + `popstate` dispatched + overlay owns no history entry
  - Render `components/modals/PDFPreviewModal.tsx` (jsdom) with a spy `onClose`, then dispatch a `window` `popstate` event to simulate mobile/hardware Back (from Bug Condition `isBugCondition_Viewer`)
  - Assert the Expected Behavior: `onClose` is invoked and the app is not navigated to the Google login page
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS - no `popstate` listener exists, so `onClose` is never called (proves the bug exists)
  - Document counterexamples (e.g., "popstate dispatched while viewer open -> onClose never called; Back leaves the app")
  - _Requirements: 1.1, 1.2, 2.1, 2.2_

- [ ]* 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Non-Back Viewer & Navigation Behavior
  - **IMPORTANT**: Follow observation-first methodology - observe UNFIXED behavior, then encode it
  - Observe: clicking the X button in the viewer invokes the existing `onClose` handler and closes the overlay
  - Observe: other modals (`ShareModal`, `SummarizePanel`, `UploadModal`, `MultiShareModal`) close via their own handlers, unaffected by history
  - Observe: with the viewer closed, `popstate` behaves as standard route navigation
  - Write property-based tests over random open/close/Back/Forward sequences asserting these observed behaviors (from Preservation Requirements in design)
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (confirms baseline behavior to preserve)
  - _Requirements: 3.1, 3.2, 3.3, 3.6_

- [ ] 3. Fix viewer Back navigation and session persistence

  - [ ] 3.1 Create the `useHistoryBackClose` hook
    - New file `components/modals/useHistoryBackClose.ts` exporting `useHistoryBackClose(active, onClose): { closeWithHistory }`
    - On activate: `window.history.pushState({ __modal: true }, "")` (guarded by `pushedRef` so re-renders push only one entry)
    - Register a `popstate` listener that calls the latest `onClose` via `onCloseRef`, guarded by `closingRef` to prevent double-close
    - Cleanup: remove the listener; if the entry was pushed and not popped by Back, call `window.history.back()` to balance history
    - `closeWithHistory()`: call `window.history.back()` when an entry was pushed (routes through `popstate` -> `onClose`), else call `onClose` directly
    - SSR-safe: guard all `window`/`history` access with `typeof window !== "undefined"`
    - _Bug_Condition: isBugCondition_Viewer(input) where viewerOpen=true, backPressed=true, overlayHasHistoryEntry=false_
    - _Expected_Behavior: overlay closed via onClose AND stays in-app AND not navigated to Google login (Property 1)_
    - _Preservation: Preservation Requirements (Property 2) - other modals unaffected_
    - _Requirements: 2.1, 2.2_

  - [ ] 3.2 Integrate the hook into `PDFPreviewModal`
    - In `components/modals/PDFPreviewModal.tsx` call `const { closeWithHistory } = useHistoryBackClose(true, onClose);` near the top (modal only mounts when open)
    - Change the X button handler from `onClick={onClose}` to `onClick={closeWithHistory}` (or `onClick={() => window.history.back()}`)
    - Preserve all existing viewer features: zoom, page navigation, annotation toolbar, PDF loading via presigned URL, loading/error states
    - No call-site changes needed - `NotesList.tsx`, `app/shared/[token]/page.tsx`, `app/shared/collection/[token]/page.tsx` keep passing their existing `onClose`
    - _Bug_Condition: isBugCondition_Viewer(input) from design_
    - _Expected_Behavior: expectedBehavior - Back and X both route through onClose, history balanced (Property 1)_
    - _Preservation: X-button close and viewer features unchanged (Property 2)_
    - _Requirements: 2.1, 2.2, 3.1, 3.2_

  - [ ] 3.3 Align session and JWT lifetimes in `lib/auth.ts`
    - Set `session.maxAge = 2 * 24 * 60 * 60` (2 days), keeping `session.strategy: "jwt"`
    - Add a top-level `jwt: { maxAge: 2 * 24 * 60 * 60 }` block so token lifetime matches the session lifetime
    - Leave providers (`Google`, `Credentials`) and callbacks (`signIn`, `jwt`, `session`) exactly as they are
    - _Bug_Condition: isBugCondition_Session(input) where elapsedSinceLogin < 2 days AND (authSecretUnstable OR jwtMaxAgeMisaligned)_
    - _Expected_Behavior: session valid for full ~2-day window when elapsed < 2 days (Property 3)_
    - _Preservation: sign-in flows, callbacks, session.user.id, expiry after 2 days unchanged (Property 4)_
    - _Requirements: 2.3, 3.4, 3.5_

  - [ ] 3.4 Document `AUTH_SECRET` and add `.env.example`
    - Update `README.md`: document that `AUTH_SECRET` MUST be set to a stable value in every environment so JWTs survive redeploys/cold starts and sessions persist the full 2 days
    - Add a new `.env.example` with placeholder values: `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `MONGODB_URI`, plus other referenced deployment vars (S3/storage and AI/summarize keys) as placeholders
    - _Bug_Condition: isBugCondition_Session - unstable AUTH_SECRET invalidates JWTs early_
    - _Expected_Behavior: stable documented AUTH_SECRET keeps sessions valid across deploys (Property 3)_
    - _Requirements: 2.4_

  - [ ]* 3.5 Verify bug condition exploration test now passes (fix checking)
    - **Property 1: Expected Behavior** - Back Closes the Viewer
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - Run the viewer Back exploration test from task 1 against the fixed code
    - **EXPECTED OUTCOME**: Test PASSES - `popstate` now invokes `onClose`, overlay closes, user stays in-app
    - Also fix-check session config: assert `session.maxAge` and `jwt.maxAge` both equal `2 * 24 * 60 * 60` and `AUTH_SECRET` is documented (Property 3)
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ]* 3.6 Verify preservation tests still pass (preservation checking)
    - **Property 2: Preservation** - Non-Back Viewer & Navigation Behavior
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run the preservation property tests from task 2 against the fixed code
    - **EXPECTED OUTCOME**: Tests PASS - X-button close, other modals, and normal route navigation are unchanged; history stays balanced
    - Confirm auth-flow preservation: credentials/Google sign-in and `session.user.id` exposure unchanged (Property 4)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [ ] 4. Checkpoint - Ensure all tests pass
  - Ensure the exploration test (Property 1) and preservation tests (Property 2) all pass on the fixed code with no regressions
  - Confirm both fixes are isolated (client-side viewer navigation; auth config + docs) and shared logic is untouched
  - Ask the user if any questions arise

## Task Dependency Graph

```
1. Exploration test (Property 1)      2. Preservation tests (Property 2)
        (fails on unfixed)                   (pass on unfixed)
              \                                    /
               \                                  /
                v                                v
        3.1 Create useHistoryBackClose.ts
                     |
                     v
        3.2 Integrate hook into PDFPreviewModal
                     |
        3.3 Align session/jwt maxAge (lib/auth.ts)   [independent of 3.1/3.2]
                     |
        3.4 Document AUTH_SECRET + .env.example        [depends on 3.3 context]
                     |
                     v
        3.5 Fix checking (re-run task 1)  ---\
        3.6 Preservation checking (re-run task 2) --> 4. Checkpoint
```

Notes:
- Tasks 1 and 2 are independent and can be done in parallel; both precede all implementation.
- The viewer fix (3.1 -> 3.2) and the session fix (3.3 -> 3.4) are independent tracks and may proceed in either order.
- Tasks 3.5 and 3.6 depend on all implementation sub-tasks completing.
