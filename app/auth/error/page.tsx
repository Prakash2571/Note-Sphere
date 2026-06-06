/**
 * app/auth/error/page.tsx
 */

"use client";

import { Suspense } from "react";

import Link from "next/link";

import { useSearchParams } from "next/navigation";

import {
  AlertCircle,
  BookOpen,
  Loader2,
} from "lucide-react";

const errorMessages: Record<
  string,
  string
> = {
  Configuration:
    "There is a problem with the server configuration.",

  AccessDenied:
    "You do not have permission to sign in.",

  Verification:
    "This sign-in link is no longer valid.",

  OAuthSignin:
    "Failed to start Google sign-in.",

  OAuthCallback:
    "Google authentication failed.",

  OAuthCreateAccount:
    "Unable to create your account using Google.",

  EmailCreateAccount:
    "Unable to create your account using email.",

  Callback:
    "Something went wrong during sign in.",

  OAuthAccountNotLinked:
    "This email is already connected to another sign-in method.",

  SessionRequired:
    "You must be signed in to access this page.",

  Default:
    "Something went wrong. Please try again.",
};

function ErrorContent() {
  const searchParams =
    useSearchParams();

  const error =
    searchParams.get("error") ||
    "Default";

  const message =
    errorMessages[error] ||
    errorMessages.Default;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0b1120] px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#111827] p-6 sm:p-8">
        {/* Logo */}
        <Link
          href="/"
          className="mb-8 flex items-center justify-center gap-3"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-red-500 to-blue-600">
            <BookOpen className="h-5 w-5 text-white" />
          </div>

          <span className="text-lg font-semibold tracking-tight text-white">
            NoteSphere
          </span>
        </Link>

        {/* Icon */}
        <div className="mb-5 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10">
            <AlertCircle className="h-8 w-8 text-red-400" />
          </div>
        </div>

        {/* Content */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">
            Authentication Error
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-400">
            {message}
          </p>
        </div>

        {/* Actions */}
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/auth/signin"
            className="flex flex-1 items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-blue-500"
          >
            Try Again
          </Link>

          <Link
            href="/"
            className="flex flex-1 items-center justify-center rounded-xl border border-white/10 bg-white/3 px-5 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/5"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}

/* Loading fallback */
function ErrorFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0b1120]">
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10">
          <Loader2 className="h-7 w-7 animate-spin text-blue-400" />
        </div>

        <p className="text-sm text-slate-500">
          Loading...
        </p>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<ErrorFallback />}>
      <ErrorContent />
    </Suspense>
  );
}