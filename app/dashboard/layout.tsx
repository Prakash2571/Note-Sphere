/**
 * app/dashboard/layout.tsx
 *
 * Dashboard shell — wraps all /dashboard/* pages with the sidebar + header.
 *
 * Auth.js v5:  auth() replaces getServerSession(authOptions).
 * Next.js 16:  middleware already handles the redirect for unauthenticated
 *              users, but we keep a server-side check here as a safety net.
 */

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side guard — middleware covers most cases, but this ensures
  // the layout never renders without a valid session.
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  return (
    <div className="flex h-screen bg-[#0a0f1e] overflow-hidden">
      {/* Fixed-width sidebar */}
      <Sidebar user={session.user} />

      {/* Scrollable content area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <DashboardHeader user={session.user} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
