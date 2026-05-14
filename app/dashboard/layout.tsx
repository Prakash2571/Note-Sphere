/**
 * app/dashboard/layout.tsx
 * Dashboard layout — wraps all /dashboard/* pages with the sidebar and header.
 * Redirects unauthenticated users to the sign-in page.
 */

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side auth check — redirect if not signed in
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/auth/signin");
  }

  return (
    <div className="flex h-screen bg-[#0a0f1e] overflow-hidden">
      {/* Fixed sidebar */}
      <Sidebar user={session.user} />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <DashboardHeader user={session.user} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
