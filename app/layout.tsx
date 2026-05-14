/**
 * app/layout.tsx
 * Root layout — sets up fonts, metadata, and the NextAuth session provider.
 */

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Note-Sphere — Your PDF Knowledge Hub",
  description:
    "Upload, organize, preview, and AI-summarize your PDF notes. Share them with anyone.",
  keywords: ["PDF notes", "AI summarization", "note organizer", "Gemini AI"],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-[#0a0f1e] text-slate-100 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
