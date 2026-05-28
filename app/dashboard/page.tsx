/**
 * app/dashboard/page.tsx
 */

import { Suspense } from "react";

import { redirect }
from "next/navigation";

import { Loader2 }
from "lucide-react";

import { auth }
from "@/lib/auth";

import { NotesList }
from "@/components/dashboard/NotesList";

/**
 * Disable caching completely
 */
export const dynamic =
  "force-dynamic";

export const revalidate =
  0;

export const fetchCache =
  "force-no-store";

function NotesFallback() {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#111827] px-4 py-4 text-sm text-slate-400">
      <Loader2 className="h-4 w-4 animate-spin text-blue-400" />

      Loading notes...
    </div>
  );
}

export default async function DashboardPage() {
  /**
   * Check auth server-side
   */
  const session =
    await auth();

  /**
   * Redirect if not logged in
   */
  if (!session) {
    redirect("/auth/signin");
  }

  return (
    <section>
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          My Notes
        </h1>

        <p className="mt-2 text-sm leading-6 text-slate-400">
          Access, organize,
          and manage all your
          uploaded PDFs in one
          place.
        </p>
      </div>

      {/* Notes */}
      <Suspense
        fallback={
          <NotesFallback />
        }
      >
        <NotesList />
      </Suspense>
    </section>
  );
}