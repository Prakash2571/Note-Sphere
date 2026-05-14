/**
 * app/page.tsx
 * Landing page — red/blue dark theme.
 * Shows features, hero CTA, and navigation.
 */

import Link from "next/link";
import {
  FileText,
  Tag,
  Share2,
  Sparkles,
  Eye,
  Upload,
  ChevronRight,
  BookOpen,
  Shield,
  Zap,
} from "lucide-react";

// ── Feature card data ──────────────────────────────────────────────────────────
const features = [
  {
    icon: Upload,
    title: "Upload PDFs",
    description:
      "Securely upload and store your PDF notes on AWS S3. Up to 50MB per file with instant access.",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
  },
  {
    icon: Tag,
    title: "Organize & Label",
    description:
      "Create custom color-coded labels to categorize your notes. Filter and find them in seconds.",
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
  },
  {
    icon: Eye,
    title: "Preview Notes",
    description:
      "Open any PDF right in your browser with our built-in viewer. No downloads needed.",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
  },
  {
    icon: Sparkles,
    title: "AI Summarization",
    description:
      "Powered by Google Gemini. Get smart, structured summaries of any PDF with one click.",
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
  },
  {
    icon: Share2,
    title: "Share Notes",
    description:
      "Generate shareable links for any note. Anyone with the link can preview the PDF.",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
  },
  {
    icon: Shield,
    title: "Secure & Private",
    description:
      "Your notes are private by default. Only you can see them unless you choose to share.",
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
  },
];

// ── Stats ──────────────────────────────────────────────────────────────────────
const stats = [
  { value: "50MB", label: "Max file size" },
  { value: "AI", label: "Gemini powered" },
  { value: "S3", label: "Secure storage" },
  { value: "∞", label: "Notes to upload" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0f1e] overflow-x-hidden">
      {/* ── Navigation ──────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0f1e]/80 backdrop-blur-md border-b border-[#1e2d45]">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-blue-600 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-red-400 to-blue-400 bg-clip-text text-transparent">
              Note-Sphere
            </span>
          </div>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-8 text-sm text-slate-400">
            <a href="#features" className="hover:text-white transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-white transition-colors">
              How it works
            </a>
          </div>

          {/* Auth buttons */}
          <div className="flex items-center gap-3">
            <Link
              href="/auth/signin"
              className="text-sm text-slate-300 hover:text-white transition-colors px-4 py-2"
            >
              Sign In
            </Link>
            <Link
              href="/auth/signup"
              className="text-sm bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white px-4 py-2 rounded-lg font-medium transition-all shadow-lg shadow-red-900/30"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero Section ────────────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-24 px-6">
        {/* Background glow effects */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-40 left-1/4 w-[300px] h-[300px] bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-40 right-1/4 w-[300px] h-[300px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-5xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 text-sm text-blue-400 mb-8">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Powered by Google Gemini AI</span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-tight">
            <span className="text-white">Your PDF Notes,</span>
            <br />
            <span className="bg-gradient-to-r from-red-400 via-red-300 to-blue-400 bg-clip-text text-transparent">
              Organized &amp; Intelligent
            </span>
          </h1>

          {/* Subheading */}
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Upload your PDFs, organize them with labels, preview them instantly,
            get AI-powered summaries, and share them with anyone — all in one place.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/auth/signup"
              className="group flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all shadow-xl shadow-red-900/40 hover:shadow-red-900/60 hover:-translate-y-0.5"
            >
              Start for Free
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/auth/signin"
              className="flex items-center gap-2 bg-[#111827] hover:bg-[#1a2235] border border-[#1e2d45] hover:border-blue-500/40 text-slate-300 hover:text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all"
            >
              Sign In
            </Link>
          </div>

          {/* Stats strip */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-2xl mx-auto">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-bold bg-gradient-to-r from-red-400 to-blue-400 bg-clip-text text-transparent">
                  {stat.value}
                </div>
                <div className="text-sm text-slate-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features Grid ────────────────────────────────────────────────────── */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Everything you need for your PDFs
            </h2>
            <p className="text-slate-400 text-lg max-w-xl mx-auto">
              A complete toolkit for managing, understanding, and sharing your PDF notes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className={`group p-6 rounded-2xl bg-[#111827] border ${feature.border} hover:border-opacity-60 transition-all hover:-translate-y-1`}
                >
                  <div
                    className={`w-12 h-12 rounded-xl ${feature.bg} flex items-center justify-center mb-4`}
                  >
                    <Icon className={`w-6 h-6 ${feature.color}`} />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 px-6 bg-[#0d1526]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              How it works
            </h2>
            <p className="text-slate-400 text-lg">Simple. Fast. Powerful.</p>
          </div>

          <div className="space-y-6">
            {[
              {
                step: "01",
                title: "Create an account",
                desc: "Sign up with email/password or continue with Google. It takes less than a minute.",
                icon: Shield,
                color: "from-red-500 to-red-600",
              },
              {
                step: "02",
                title: "Upload your PDFs",
                desc: "Drag and drop or browse to upload your PDF notes. Add a title, description, and labels.",
                icon: Upload,
                color: "from-blue-500 to-blue-600",
              },
              {
                step: "03",
                title: "Organize with labels",
                desc: "Create custom labels with colors. Assign multiple labels to each note for easy filtering.",
                icon: Tag,
                color: "from-red-500 to-blue-500",
              },
              {
                step: "04",
                title: "Summarize with AI",
                desc: "Click 'Summarize' on any note — Gemini reads the PDF and gives you a structured summary instantly.",
                icon: Sparkles,
                color: "from-blue-500 to-red-500",
              },
              {
                step: "05",
                title: "Share with anyone",
                desc: "Generate a public link and share it. Anyone can preview the PDF without an account.",
                icon: Share2,
                color: "from-red-500 to-red-600",
              },
            ].map((item, index) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.step}
                  className="flex items-start gap-6 p-6 rounded-2xl bg-[#111827] border border-[#1e2d45]"
                >
                  <div
                    className={`flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center shadow-lg`}
                  >
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-xs font-bold text-slate-500 tracking-widest uppercase">
                        Step {item.step}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-1">{item.title}</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ───────────────────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="relative p-12 rounded-3xl bg-gradient-to-br from-[#111827] to-[#0d1526] border border-[#1e2d45] overflow-hidden">
            {/* Glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-red-600/5 to-blue-600/5 pointer-events-none" />

            <Zap className="w-12 h-12 text-red-400 mx-auto mb-6" />
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to organize your knowledge?
            </h2>
            <p className="text-slate-400 mb-8 text-lg">
              Join Note-Sphere and never lose track of an important PDF again.
            </p>
            <Link
              href="/auth/signup"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all shadow-xl shadow-red-900/40"
            >
              Get Started Free
              <ChevronRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer className="border-t border-[#1e2d45] py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-red-500 to-blue-600 flex items-center justify-center">
              <BookOpen className="w-3 h-3 text-white" />
            </div>
            <span className="font-semibold bg-gradient-to-r from-red-400 to-blue-400 bg-clip-text text-transparent">
              Note-Sphere
            </span>
          </div>
          <p className="text-slate-500 text-sm">
            © {new Date().getFullYear()} Note-Sphere. Built with Next.js &amp; Gemini AI.
          </p>
        </div>
      </footer>
    </div>
  );
}
