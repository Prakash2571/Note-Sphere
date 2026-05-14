/**
 * components/dashboard/Sidebar.tsx
 * Left sidebar — navigation links, labels list, and user info.
 */

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  LayoutDashboard,
  Tag,
  Share2,
  Plus,
  Loader2,
  Circle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Label {
  _id: string;
  name: string;
  color: string;
  noteCount: number;
}

interface SidebarProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const [labels, setLabels] = useState<Label[]>([]);
  const [isLoadingLabels, setIsLoadingLabels] = useState(true);

  // Fetch labels for the sidebar list
  useEffect(() => {
    async function fetchLabels() {
      try {
        const res = await fetch("/api/labels");
        const data = await res.json();
        setLabels(data.labels || []);
      } catch {
        // Silently fail — labels are non-critical for navigation
      } finally {
        setIsLoadingLabels(false);
      }
    }
    fetchLabels();
  }, []);

  const navLinks = [
    { href: "/dashboard", label: "All Notes", icon: LayoutDashboard },
    { href: "/dashboard/labels", label: "Labels", icon: Tag },
    { href: "/dashboard/shared", label: "Shared Notes", icon: Share2 },
  ];

  return (
    <aside className="w-64 flex-shrink-0 bg-[#0d1526] border-r border-[#1e2d45] flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-[#1e2d45]">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-blue-600 flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold bg-gradient-to-r from-red-400 to-blue-400 bg-clip-text text-transparent">
            Note-Sphere
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navLinks.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                isActive
                  ? "bg-blue-600/20 text-blue-400 border border-blue-500/20"
                  : "text-slate-400 hover:text-white hover:bg-[#1a2235]"
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          );
        })}

        {/* Labels Section */}
        <div className="pt-4">
          <div className="flex items-center justify-between px-3 mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Labels
            </span>
            <Link
              href="/dashboard/labels"
              className="text-slate-500 hover:text-blue-400 transition-colors"
              title="Manage labels"
            >
              <Plus className="w-3.5 h-3.5" />
            </Link>
          </div>

          {isLoadingLabels ? (
            <div className="flex items-center gap-2 px-3 py-2 text-slate-600 text-sm">
              <Loader2 className="w-3 h-3 animate-spin" />
              Loading...
            </div>
          ) : labels.length === 0 ? (
            <p className="px-3 text-xs text-slate-600">No labels yet</p>
          ) : (
            <div className="space-y-0.5">
              {labels.map((label) => {
                const isActive = pathname === `/dashboard?label=${label._id}`;
                return (
                  <Link
                    key={label._id}
                    href={`/dashboard?label=${label._id}`}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all",
                      isActive
                        ? "bg-[#1a2235] text-white"
                        : "text-slate-400 hover:text-white hover:bg-[#1a2235]"
                    )}
                  >
                    <Circle
                      className="w-2.5 h-2.5 flex-shrink-0 fill-current"
                      style={{ color: label.color }}
                    />
                    <span className="truncate flex-1">{label.name}</span>
                    <span className="text-xs text-slate-600">{label.noteCount}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </nav>

      {/* User info at bottom */}
      <div className="px-4 py-4 border-t border-[#1e2d45]">
        <div className="flex items-center gap-3">
          {user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.image}
              alt={user.name || "User"}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
              {user.name?.charAt(0).toUpperCase() || "U"}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-300 truncate">
              {user.name || "User"}
            </p>
            <p className="text-xs text-slate-500 truncate">{user.email}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
