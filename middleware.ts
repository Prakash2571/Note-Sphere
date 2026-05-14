/**
 * middleware.ts  (Next.js 15 App Router)
 *
 * Auth.js v5 middleware — protects routes at the Edge before any page renders.
 *
 * How it works:
 *  - auth() from Auth.js is used as the middleware function directly.
 *  - The `authorized` callback decides whether the request is allowed through.
 *  - Unauthenticated requests to /dashboard/* are redirected to /auth/signin.
 *  - Public routes (landing, auth pages, shared notes, API) pass through freely.
 *
 * The `config.matcher` tells Next.js which paths to run the middleware on.
 * We skip static files, images, and favicon to keep things fast.
 */

import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default auth((req) => {
  const { nextUrl, auth: session } = req;
  const isLoggedIn = !!session?.user;

  // ── Protected route prefixes ──────────────────────────────────────────────
  const isProtectedRoute = nextUrl.pathname.startsWith("/dashboard");

  if (isProtectedRoute && !isLoggedIn) {
    // Redirect to sign-in, preserving the intended destination
    const signInUrl = new URL("/auth/signin", nextUrl.origin);
    signInUrl.searchParams.set("callbackUrl", nextUrl.pathname);
    return NextResponse.redirect(signInUrl);
  }

  // ── Redirect authenticated users away from auth pages ─────────────────────
  const isAuthPage =
    nextUrl.pathname.startsWith("/auth/signin") ||
    nextUrl.pathname.startsWith("/auth/signup");

  if (isAuthPage && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  /*
   * Match all paths EXCEPT:
   *  - _next/static  (static assets)
   *  - _next/image   (image optimisation)
   *  - favicon.ico
   *  - public folder files (svg, png, jpg, etc.)
   */
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
