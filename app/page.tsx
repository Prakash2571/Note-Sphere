/**
 * app/page.tsx
 */

import Link from "next/link";
import {
  BookOpen,
  FileText,
  Sparkles,
  Share2,
  Tag,
  ChevronRight,
  Eye,
} from "lucide-react";

const features = [
  {
    icon: FileText,
    title: "Upload PDFs",
    desc: "Store your notes and documents in one place.",
  },
  {
    icon: Tag,
    title: "Labels & Tags",
    desc: "Organize everything with custom colors.",
  },
  {
    icon: Sparkles,
    title: "AI Summaries",
    desc: "Get quick key points from long PDFs.",
  },
  {
    icon: Eye,
    title: "Instant Preview",
    desc: "View files without downloading them.",
  },
  {
    icon: Share2,
    title: "Easy Sharing",
    desc: "Share public links in one click.",
  },
  {
    icon: BookOpen,
    title: "Private Storage",
    desc: "Your notes stay secure and accessible.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0b1120] text-white flex flex-col">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#0b1120]/80 backdrop-blur">
        <div className="max-w-7xl mx-auto h-16 px-4 sm:px-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-linear-to-br from-red-500 to-blue-600 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </div>

            <span className="font-bold text-lg tracking-tight">
              Note-Sphere
            </span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/auth/signin"
              className="text-sm text-slate-300 hover:text-white transition"
            >
              Sign In
            </Link>

            <Link
              href="/auth/signup"
              className="rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2 text-sm font-medium transition"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1">
        <section className="relative overflow-hidden">
          {/* Background glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[125px] h-[500px] bg-blue-500/20 blur-3xl rounded-full" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 border border-white/10 bg-white/5 rounded-full px-4 py-2 text-sm text-slate-300 mb-6">
                <Sparkles className="w-4 h-4 text-blue-400" />
                Smart PDF workspace
              </div>

              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight tracking-tight">
                Manage your PDF notes
                <span className="block bg-linear-to-r from-blue-400 to-red-400 bg-clip-text text-transparent">
                  without the mess
                </span>
              </h1>

              <p className="mt-6 text-slate-400 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
                Upload PDFs, organize them with labels, preview instantly,
                generate AI summaries, and share files from a clean dashboard.
              </p>

              {/* CTA */}
              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/auth/signup"
                  className="group flex items-center justify-center gap-2 w-full sm:w-auto bg-blue-600 hover:bg-blue-500 px-6 py-3 rounded-xl font-semibold transition"
                >
                  Start for Free

                  <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Link>

                <Link
                  href="/auth/signin"
                  className="w-full sm:w-auto border border-white/10 hover:border-white/20 px-6 py-3 rounded-xl text-slate-300 hover:text-white transition"
                >
                  Sign In
                </Link>
              </div>
            </div>

            {/* Features */}
            <div className="mt-20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {features.map(({ icon: Icon, title, desc }) => (
                <div
                  key={title}
                  className="rounded-2xl border border-white/10 bg-white/3 p-5 hover:bg-white/5 transition"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-blue-400" />
                  </div>

                  <h3 className="font-semibold text-white mb-2">
                    {title}
                  </h3>

                  <p className="text-sm text-slate-400 leading-relaxed">
                    {desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-slate-500">
          <span>
            © {new Date().getFullYear()} Note-Sphere
          </span>

          <span>Free to use</span>
        </div>
      </footer>
    </div>
  );
}