"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  BookOpen,
  Circle,
  LayoutDashboard,
  Loader2,
  Plus,
  Share2,

  
  
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";

import {
  useAppDispatch,
  useAppSelector,
} from "@/store/hooks";

import { fetchLabels } from "@/store/slices/labelsSlice";

import { setActiveLabel } from "@/store/slices/uiSlice";

interface SidebarProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };

  onClose?: () => void;
}

export function Sidebar({
  user,
  onClose,
}: SidebarProps) {
  const pathname = usePathname();

  const dispatch = useAppDispatch();

  const labels = useAppSelector(
    (state) => state.labels.items
  );

  const isLoadingLabels = useAppSelector(
    (state) => state.labels.isLoading
  );

  const activeLabelId = useAppSelector(
    (state) => state.ui.activeLabelId
  );

  useEffect(() => {
    dispatch(fetchLabels());
  }, [dispatch]);

  const navLinks = [
    {
      href: "/dashboard",
      label: "All Notes",
      icon: LayoutDashboard,
    },
   
    {
      href: "/dashboard/shared",
      label: "Shared Notes",
      icon: Share2,
    },
   
  ];

  function handleNavClick() {
    onClose?.();
  }

  return (
    <div className="flex h-full flex-col border-r border-white/10 bg-[#0f172a]">
      {/* Logo */}
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
        <Link
          href="/dashboard"
          onClick={handleNavClick}
          className="flex items-center gap-3"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-red-500 to-blue-600">
            <BookOpen className="w-4 h-4 text-white" />
          </div>

          <div>
            <p className="text-base font-semibold text-white">
              Note-Sphere
            </p>
          </div>
        </Link>

        {onClose && (
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-white/5 hover:text-white lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-1">
          {navLinks.map(
            ({ href, label, icon: Icon }) => {
              const isActive =
                pathname === href;

              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => {
                    if (href === "/dashboard") {
                      dispatch(
                        setActiveLabel(null)
                      );
                    }

                    handleNavClick();
                  }}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                    isActive
                      ? "bg-blue-500/10 text-blue-400"
                      : "text-slate-400 hover:bg-white/4 hover:text-white"
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />

                  {label}
                </Link>
              );
            }
          )}
        </div>

        {/* Labels */}
        <div className="mt-7 border-t border-white/10 pt-5">
          <div className="mb-3 flex items-center justify-between px-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Labels
            </span>

            <Link
              href="/dashboard/labels"
              onClick={handleNavClick}
              className="rounded-md p-1 text-slate-500 transition hover:bg-white/5 hover:text-white"
            >
              <Plus className="w-4 h-4" />
            </Link>
          </div>

          {isLoadingLabels ? (
            <div className="flex items-center gap-2 px-3 py-2 text-sm text-slate-500">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Loading...
            </div>
          ) : labels.length === 0 ? (
            <p className="px-3 text-sm text-slate-500">
              No labels yet
            </p>
          ) : (
            <div className="space-y-1">
              {labels.map((label) => {
                const isActive =
                  activeLabelId === label._id;

                return (
                  <button
                    key={label._id}
                    onClick={() => {
                      dispatch(
                        setActiveLabel(
                          isActive
                            ? null
                            : label._id
                        )
                      );

                      handleNavClick();
                    }}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
                      isActive
                        ? "bg-white/5 text-white"
                        : "text-slate-400 hover:bg-white/4 hover:text-white"
                    )}
                  >
                    <Circle
                      className="w-3 h-3 shrink-0 fill-current"
                      style={{
                        color: label.color,
                      }}
                    />

                    <span className="flex-1 truncate text-left">
                      {label.name}
                    </span>

                    <span className="text-xs text-slate-500">
                      {label.noteCount}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </nav>

      {/* User section */}
      <Link
        href="/dashboard/profile"
        onClick={handleNavClick}
        className="border-t border-white/10 px-4 py-4 transition hover:bg-white/3"
      >
        <div className="flex items-center gap-3">
          {user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.image}
              alt={user.name || "User"}
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-linear-to-br from-red-500 to-blue-600 text-sm font-semibold text-white">
              {user.name?.charAt(0).toUpperCase() ||
                "U"}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">
              {user.name || "User"}
            </p>

            <p className="truncate text-xs text-slate-500">
              {user.email}
            </p>
          </div>
        </div>
      </Link>
    </div>
  );
}