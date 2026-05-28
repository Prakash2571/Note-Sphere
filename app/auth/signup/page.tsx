/**
 * app/auth/signup/page.tsx
 */

"use client";

import { useState } from "react";

import Link from "next/link";

import { useRouter } from "next/navigation";

import { signIn } from "next-auth/react";

import {
  BookOpen,
  CheckCircle2,
 Globe ,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  User,
} from "lucide-react";

export default function SignUpPage() {
  const router = useRouter();

  const [name, setName] =
    useState("");

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

  const [success, setSuccess] =
    useState(false);

  /* Password checks */
  const passwordChecks = [
    {
      label: "At least 8 characters",
      valid: password.length >= 8,
    },
    {
      label: "Contains a number",
      valid: /\d/.test(password),
    },
    {
      label: "Contains a letter",
      valid: /[a-zA-Z]/.test(password),
    },
  ];

  /* Register */
  async function handleSignUp(
    e: React.FormEvent
  ) {
    e.preventDefault();

    setError("");
    setIsLoading(true);

    try {
      const res = await fetch(
        "/api/auth/register",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            name,
            email,
            password,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setError(
          data.error ||
            "Failed to create account."
        );

        return;
      }

      /* Auto sign in */
      const result = await signIn(
        "credentials",
        {
          email,
          password,
          redirect: false,
        }
      );

      if (result?.error) {
        setSuccess(true);

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

  /* Google */
  async function handleGoogleSignIn() {
    setIsGoogleLoading(true);

    await signIn("google", {
      callbackUrl: "/dashboard",
    });
  }

  /* Success state */
  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b1120] px-4 py-10">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#111827] p-6 sm:p-8 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-500/10">
            <CheckCircle2 className="h-8 w-8 text-green-400" />
          </div>

          <h1 className="text-2xl font-bold text-white">
            Account created
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-400">
            Your account has been created
            successfully. You can now sign
            in.
          </p>

          <Link
            href="/auth/signin"
            className="mt-7 inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-blue-500"
          >
            Continue to Sign In
          </Link>
        </div>
      </div>
    );
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
              Note-Sphere
            </span>
          </Link>

          <h1 className="mt-6 text-2xl font-bold text-white">
            Create your account
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            Start organizing your PDFs and
            notes
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
            <Globe className="h-4 w-4 text-blue-400" />
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
          onSubmit={handleSignUp}
          className="space-y-5"
        >
          {/* Name */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Full name
            </label>

            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />

              <input
                type="text"
                value={name}
                onChange={(e) =>
                  setName(
                    e.target.value
                  )
                }
                required
                placeholder=""
                className="w-full rounded-xl border border-white/10 bg-[#0f172a] py-3 pl-10 pr-4 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-blue-400/40"
              />
            </div>
          </div>

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
                placeholder="Minimum 8 characters"
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

            {/* Checks */}
            {password.length > 0 && (
              <div className="mt-3 space-y-2">
                {passwordChecks.map(
                  (check) => (
                    <div
                      key={check.label}
                      className="flex items-center gap-2"
                    >
                      <div
                        className={`h-1.5 w-1.5 rounded-full ${
                          check.valid
                            ? "bg-green-400"
                            : "bg-slate-600"
                        }`}
                      />

                      <span
                        className={`text-xs ${
                          check.valid
                            ? "text-green-400"
                            : "text-slate-500"
                        }`}
                      >
                        {check.label}
                      </span>
                    </div>
                  )
                )}
              </div>
            )}
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
                Creating account...
              </>
            ) : (
              "Create Account"
            )}
          </button>
        </form>

        {/* Footer */}
        <p className="mt-7 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link
            href="/auth/signin"
            className="font-medium text-blue-400 transition hover:text-blue-300"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}