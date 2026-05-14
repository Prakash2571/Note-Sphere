/**
 * app/auth/error/page.tsx
 * Auth error page — shown when NextAuth encounters an error.
 */

"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertCircle, BookOpen } from "lucide-react";
import { Suspense } from "react";

const errorMessages: Record<string, string> = {
  Configuration: "There is a problem with the server configuration.",
  AccessDenied: "You do not have permission to sign in.",
  Verification: "The sign in link is no longer valid.",
  Default: "An unexpected error occurred. Please try again.",
  OAuthSignin: "Error in the OAuth sign-in flow. Please try again.",
  OAuthCallback: "Error in the OAuth callback. Please try again.",
  OAuthCreateAccount: "Could not create an account using your OAuth profile.",
  EmailCreateAccount: "Could not create an account using your email.",
  Callback: "Error during the sign-in callback.",
  OAuthAccountNotLinked:
    "This email is already registered with a different sign-in method.",
  SessionRequired: "You must be signed in to access this page.",
};

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error") || "Default";
  const message = errorMessages[error] || errorMessages.Default;

  return (
    <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center px-4">
      <div className="bg-[#111827] border border-[#1e2d45] rounded-2xl p-8 max-w-md w-full text-center">
        {/* Logo */}
        <Link href="/" className="inline-flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-blue-600 flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold bg-gradient-to-r from-red-400 to-blue-400 bg-clip-text text-transparent">
            Note-Sphere
          </span>
        </Link>

        <AlertCircle className="w-14 h-14 text-red-400 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-white mb-2">Authentication Error</h1>
        <p className="text-slate-400 text-sm mb-6">{message}</p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/auth/signin"
            className="bg-gradient-to-r from-red-600 to-red-500 text-white px-6 py-2.5 rounded-lg font-medium text-sm"
          >
            Try Again
          </Link>
          <Link
            href="/"
            className="bg-[#1a2235] border border-[#2d3f5a] text-slate-300 px-6 py-2.5 rounded-lg font-medium text-sm"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0f1e]" />}>
      <ErrorContent />
    </Suspense>
  );
}
