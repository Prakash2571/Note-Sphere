/**
 * app/auth/signin/page.tsx
 * Sign-in page — email/password credentials + Google OAuth.
 *
 * Auth.js v5: signIn() from "next-auth/react" works identically to v4 on
 * the client side. The only change is that error messages come back in
 * result.error.message (not result.error) in some edge cases — we handle both.
 */

"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BookOpen, Mail, Lock, Eye, EyeOff, Chrome, Loader2 } from "lucide-react";

export default function SignInPage() {
  const router = useRouter();

  const [email,          setEmail]          = useState("");
  const [password,       setPassword]       = useState("");
  const [showPassword,   setShowPassword]   = useState(false);
  const [isLoading,      setIsLoading]      = useState(false);
  const [isGoogleLoading,setIsGoogleLoading]= useState(false);
  const [error,          setError]          = useState("");

  // ── Email / password sign-in ───────────────────────────────────────────────
  async function handleCredentialsSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        // Auth.js v5 may return the raw error string or an object
        setError(typeof result.error === "string" ? result.error : "Invalid credentials.");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  // ── Google OAuth ───────────────────────────────────────────────────────────
  async function handleGoogleSignIn() {
    setIsGoogleLoading(true);
    // Auth.js v5: callbackUrl still works the same way
    await signIn("google", { callbackUrl: "/dashboard" });
  }

  return (
    <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center px-4 py-12">
      {/* Ambient glows */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-blue-600/8 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 right-1/4  w-[400px] h-[300px] bg-red-600/8  rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md">
        <div className="bg-[#111827] border border-[#1e2d45] rounded-2xl p-8 shadow-2xl">

          {/* Logo */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-blue-600 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-red-400 to-blue-400 bg-clip-text text-transparent">
                Note-Sphere
              </span>
            </Link>
            <h1 className="text-2xl font-bold text-white">Welcome back</h1>
            <p className="text-slate-400 mt-1 text-sm">Sign in to your account</p>
          </div>

          {/* Error banner */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Google */}
          <button
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading || isLoading}
            className="w-full flex items-center justify-center gap-3 bg-[#1a2235] hover:bg-[#1e2a42] border border-[#2d3f5a] hover:border-blue-500/40 text-slate-300 hover:text-white px-4 py-3 rounded-xl font-medium transition-all mb-6 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGoogleLoading
              ? <Loader2 className="w-5 h-5 animate-spin" />
              : <Chrome  className="w-5 h-5 text-blue-400" />}
            Continue with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-[#1e2d45]" />
            <span className="text-slate-500 text-sm">or</span>
            <div className="flex-1 h-px bg-[#1e2d45]" />
          </div>

          {/* Credentials form */}
          <form onSubmit={handleCredentialsSignIn} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="w-full bg-[#0d1526] border border-[#1e2d45] focus:border-blue-500 rounded-xl pl-10 pr-4 py-3 text-slate-100 placeholder-slate-600 outline-none transition-colors text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full bg-[#0d1526] border border-[#1e2d45] focus:border-blue-500 rounded-xl pl-10 pr-10 py-3 text-slate-100 placeholder-slate-600 outline-none transition-colors text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || isGoogleLoading}
              className="w-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white py-3 rounded-xl font-semibold transition-all shadow-lg shadow-red-900/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</> : "Sign In"}
            </button>
          </form>

          <p className="text-center text-slate-500 text-sm mt-6">
            Don&apos;t have an account?{" "}
            <Link href="/auth/signup" className="text-blue-400 hover:text-blue-300 font-medium">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
