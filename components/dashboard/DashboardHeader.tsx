"use client";

import { useState } from "react";

import Link from "next/link";

import { signOut } from "next-auth/react";

import {
  ChevronDown,
  LogOut,
  Menu,
  Search,
  Upload,
  User,
} from "lucide-react";

import { UploadModal } from "@/components/modals/UploadModal";

import {
  useAppDispatch,
  useAppSelector,
} from "@/store/hooks";

import {
  closeUploadModal,
  openUploadModal,
  setSearchQuery,
} from "@/store/slices/uiSlice";

interface DashboardHeaderProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };

  onMenuToggle?: () => void;
}

export function DashboardHeader({
  user,
  onMenuToggle,
}: DashboardHeaderProps) {
  const dispatch =
    useAppDispatch();

  const isUploadOpen =
    useAppSelector(
      (state) =>
        state.ui.uploadOpen
    );

  const searchQuery =
    useAppSelector(
      (state) =>
        state.ui.searchQuery
    );

  const [
    isUserMenuOpen,
    setIsUserMenuOpen,
  ] = useState(false);

  const handleLogout =
    async () => {
      try {
        setIsUserMenuOpen(
          false
        );

        await signOut({
          redirect: false,
        });

        window.location.replace(
          "/auth/signin"
        );
      } catch (error) {
        console.error(
          "Logout failed:",
          error
        );
      }
    };

  return (
    <>
      <header className="sticky top-0 z-30 h-20 border-b border-white/10 bg-[#08111f]/80 backdrop-blur">
        <div className="flex h-full items-center gap-3 px-4 sm:px-6">
          {/* Mobile menu */}
          <button
            onClick={
              onMenuToggle
            }
            className="flex items-center justify-center rounded-xl p-2 text-slate-400 transition hover:bg-white/5 hover:text-white lg:hidden"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Search */}
          <form
            onSubmit={(e) =>
              e.preventDefault()
            }
            className="w-full max-w-md flex-1"
          >
            <div className="relative">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-500" />

              <input
                type="text"
                value={searchQuery}
                onChange={(e) =>
                  dispatch(
                    setSearchQuery(
                      e.target.value
                    )
                  )
                }
                placeholder="Search notes..."
                className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pr-4 pl-10 text-sm text-slate-200 outline-none transition placeholder:text-slate-500 focus:border-blue-400"
              />
            </div>
          </form>

          <div className="hidden flex-1 sm:block" />

          {/* Upload */}
          <button
            onClick={() =>
              dispatch(
                openUploadModal()
              )
            }
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500"
          >
            <Upload className="h-4 w-4" />

            <span className="hidden sm:inline">
              Upload PDF
            </span>
          </button>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() =>
                setIsUserMenuOpen(
                  !isUserMenuOpen
                )
              }
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2.5 py-2 transition hover:bg-white/10"
            >
              {user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.image}
                  alt={
                    user.name ||
                    "User"
                  }
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-blue-600 text-xs font-semibold text-white">
                  {user.name
                    ?.charAt(0)
                    .toUpperCase() ||
                    "U"}
                </div>
              )}

              <span className="hidden max-w-[90px] truncate text-sm text-slate-300 md:block">
                {user.name?.split(
                  " "
                )[0] ?? "User"}
              </span>

              <ChevronDown className="hidden h-4 w-4 text-slate-500 md:block" />
            </button>

            {isUserMenuOpen && (
              <>
                {/* Overlay */}
                <div
                  className="fixed inset-0 z-10"
                  onClick={() =>
                    setIsUserMenuOpen(
                      false
                    )
                  }
                />

                {/* Dropdown */}
                <div className="absolute top-full right-0 z-20 mt-2 w-56 overflow-hidden rounded-2xl border border-white/10 bg-[#111827] shadow-2xl">
                  {/* User info */}
                  <div className="border-b border-white/10 px-4 py-3">
                    <p className="truncate text-sm font-medium text-white">
                      {user.name}
                    </p>

                    <p className="truncate text-xs text-slate-500">
                      {user.email}
                    </p>
                  </div>

                  {/* Profile */}
                  <Link
                    href="/dashboard/profile"
                    onClick={() =>
                      setIsUserMenuOpen(
                        false
                      )
                    }
                    className="flex items-center gap-3 px-4 py-3 text-sm text-slate-300 transition hover:bg-white/5"
                  >
                    <User className="h-4 w-4" />

                    My Profile
                  </Link>

                  {/* Logout */}
                  <button
                    onClick={
                      handleLogout
                    }
                    className="flex w-full items-center gap-3 px-4 py-3 text-sm text-red-400 transition hover:bg-red-500/10"
                  >
                    <LogOut className="h-4 w-4" />

                    Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Upload modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() =>
          dispatch(
            closeUploadModal()
          )
        }
        onSuccess={() =>
          dispatch(
            closeUploadModal()
          )
        }
      />
    </>
  );
}