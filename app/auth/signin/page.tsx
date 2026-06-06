/**
 * app/auth/signin/page.tsx
 */

"use client";

import { useState } from "react";

import Link from "next/link";

import { useRouter } from "next/navigation";

import { signIn } from "next-auth/react";

import {
  BookOpen,
  Globe,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
} from "lucide-react";

export default function SignInPage() {
  const router = useRouter();

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [isLoading, setIsLoading] =
    useState(false);

  const [isGoogleLoading, setIsGoogleLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  /* Credentials sign in */
  async function handleCredentialsSignIn(
    e: React.FormEvent
  ) {
    e.preventDefault();

    setError("");
    setIsLoading(true);

    try {
      const result = await signIn(
        "credentials",
        {
          email,
          password,
          redirect: false,
        }
      );

      if (result?.error) {
        setError(
          "Invalid email or password."
        );

        return;
      }

      router.push("/dashboard");

      router.refresh();
    } catch {
      setError(
        "Something went wrong. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  }

  /* Google sign in */
  async function handleGoogleSignIn() {
    setIsGoogleLoading(true);

    await signIn("google", {
      callbackUrl: "/dashboard",
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0b1120] px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#111827] p-6 sm:p-8">
        {/* Logo */}
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-3"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-linear-to-br from-red-500 to-blue-600">
              <BookOpen className="h-5 w-5 text-white" />
            </div>

            <span className="text-xl font-semibold tracking-tight text-white">
              NoteSphere
            </span>
          </Link>

          <h1 className="mt-6 text-2xl font-bold text-white">
            Welcome back
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            Sign in to continue to your account
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Google */}
        <button
          onClick={handleGoogleSignIn}
          disabled={
            isGoogleLoading || isLoading
          }
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/3 px-4 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/5 disabled:opacity-50"
        >
          {isGoogleLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Globe  className="h-4 w-4 text-blue-400" />
          )}

          Continue with Google
        </button>

        {/* Divider */}
        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-white/10" />

          <span className="text-xs text-slate-500">
            OR
          </span>

          <div className="h-px flex-1 bg-white/10" />
        </div>

        {/* Form */}
        <form
          onSubmit={
            handleCredentialsSignIn
          }
          className="space-y-5"
        >
          {/* Email */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Email
            </label>

            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />

              <input
                type="email"
                value={email}
                onChange={(e) =>
                  setEmail(
                    e.target.value
                  )
                }
                required
                placeholder="name@example.com"
                className="w-full rounded-xl border border-white/10 bg-[#0f172a] py-3 pl-10 pr-4 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-blue-400/40"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Password
            </label>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />

              <input
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                value={password}
                onChange={(e) =>
                  setPassword(
                    e.target.value
                  )
                }
                required
                placeholder="••••••••"
                className="w-full rounded-xl border border-white/10 bg-[#0f172a] py-3 pl-10 pr-11 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-blue-400/40"
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword(
                    !showPassword
                  )
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-300"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={
              isLoading ||
              isGoogleLoading
            }
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-500 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        {/* Footer */}
        <p className="mt-7 text-center text-sm text-slate-500">
          Don’t have an account?{" "}
          <Link
            href="/auth/signup"
            className="font-medium text-blue-400 transition hover:text-blue-300"
          >
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}