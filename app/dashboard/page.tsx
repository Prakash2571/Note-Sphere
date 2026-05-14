/**
 * app/dashboard/page.tsx
 * Main dashboard — shows all notes grid with search and label filter.
 */

import { NotesList } from "@/components/dashboard/NotesList";
import { Suspense } from "react";

export default function DashboardPage() {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">My Notes</h1>
        <p className="text-slate-400 text-sm mt-1">
          All your uploaded PDFs, organized and ready to access.
        </p>
      </div>
      <Suspense fallback={<div className="text-slate-400">Loading notes...</div>}>
        <NotesList />
      </Suspense>
    </div>
  );
}
