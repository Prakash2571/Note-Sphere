/**
 * components/modals/useHistoryBackClose.ts
 *
 * Ties a state-driven overlay (such as the PDF viewer) to a browser history
 * entry so that the mobile/hardware Back button closes the overlay instead of
 * popping the real history stack (which may still hold the OAuth / sign-in
 * pages from login, sending the user out of the app).
 *
 * How it works:
 *  - When the overlay becomes active we push a single synthetic history entry
 *    (`window.history.pushState`). The overlay now "owns" a history entry.
 *  - A `popstate` listener maps the browser Back press to the latest `onClose`,
 *    so Back closes the overlay while keeping the user in-app.
 *  - `closeWithHistory()` (returned) lets the X button close via the same path
 *    by calling `window.history.back()`, keeping the history stack balanced.
 *  - On cleanup without a Back pop (e.g. the component unmounts for another
 *    reason) the synthetic entry is balanced with a silent `history.back()`.
 *
 * SSR-safe: every `window` / `history` access is guarded.
 */

"use client";

import { useEffect, useRef } from "react";

export function useHistoryBackClose(
  active: boolean,
  onClose: () => void
): { closeWithHistory: () => void } {
  // Keep the latest `onClose` so the popstate listener never calls a stale one
  // without needing to re-subscribe on every render.
  const onCloseRef = useRef(onClose);

  // Whether we have pushed a synthetic history entry for the current session.
  const pushedRef = useRef(false);

  // Guard so `onClose` is not invoked twice (once from Back, once from cleanup).
  const closingRef = useRef(false);

  // Always mirror the latest handler into the ref.
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!active) return;

    // Push exactly one synthetic entry for this active session so re-renders
    // do not stack multiple entries.
    if (!pushedRef.current) {
      window.history.pushState({ __modal: true }, "");
      pushedRef.current = true;
    }

    // Back press pops our synthetic entry -> translate it into `onClose`.
    function handlePopState() {
      if (closingRef.current) return;
      closingRef.current = true;
      pushedRef.current = false;
      onCloseRef.current();
    }

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);

      // If the overlay was deactivated/unmounted by means other than a Back
      // pop, balance the synthetic entry so a later Back is not a dangling
      // no-op that leaves the app.
      if (pushedRef.current && !closingRef.current) {
        pushedRef.current = false;
        window.history.back();
      }

      closingRef.current = false;
    };
  }, [active]);

  function closeWithHistory() {
    if (typeof window !== "undefined" && pushedRef.current) {
      // Route through popstate -> onClose, keeping history balanced.
      window.history.back();
    } else {
      onCloseRef.current();
    }
  }

  return { closeWithHistory };
}
