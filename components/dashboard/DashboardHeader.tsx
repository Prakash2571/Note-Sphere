/**
 * components/dashboard/DashboardHeader.tsx
 * Top bar for dashboard pages — search, upload button, user menu.
 */

"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { Search, Upload, LogOut, User, ChevronDown } from "lucide-react";
import { UploadModal } from "@/components/modals/UploadModal";

interface DashboardHeaderProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export function DashboardHeader({ user }: DashboardHeaderProps) {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    // Dispatch a custom event so the notes list can pick it up
    window.dispatchEvent(new CustomEvent("notesSearch", { detail: searchQuery }));
  }

  return (
    <>
      <header className="bg-[#0d1526] border-b border-[#1e2d45] px-6 py-3 flex items-center gap-4 flex-shrink-0">
        {/* Search bar */}
        <form onSubmit={handleSearch} className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes by title..."
              className="w-full bg-[#111827] border border-[#1e2d45] focus:border-blue-500 rounded-xl pl-9 pr-4 py-2 text-slate-300 placeholder-slate-600 outline-none transition-colors text-sm"
            />
          </div>
        </form>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Upload button */}
        <button
          onClick={() => setIsUploadOpen(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white px-4 py-2 rounded-xl font-medium text-sm transition-all shadow-lg shadow-red-900/30"
        >
          <Upload className="w-4 h-4" />
          Upload PDF
        </button>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-2 bg-[#111827] hover:bg-[#1a2235] border border-[#1e2d45] rounded-xl px-3 py-2 transition-all"
          >
            {user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.image}
                alt={user.name || "User"}
                className="w-6 h-6 rounded-full"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-red-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                {user.name?.charAt(0).toUpperCase() || "U"}
              </div>
            )}
            <span className="text-sm text-slate-300 hidden sm:block max-w-24 truncate">
              {user.name?.split(" ")[0]}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
          </button>

          {/* Dropdown */}
          {isUserMenuOpen && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setIsUserMenuOpen(false)}
              />
              <div className="absolute right-0 top-full mt-2 w-48 bg-[#111827] border border-[#1e2d45] rounded-xl shadow-xl z-20 overflow-hidden">
                <div className="px-4 py-3 border-b border-[#1e2d45]">
                  <p className="text-sm font-medium text-slate-300 truncate">{user.name}</p>
                  <p className="text-xs text-slate-500 truncate">{user.email}</p>
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={() => {
          setIsUploadOpen(false);
          // Trigger a refresh of the notes list
          window.dispatchEvent(new CustomEvent("notesRefresh"));
        }}
      />
    </>
  );
}
