/**
 * app/dashboard/layout.tsx
 */

import { redirect }
from "next/navigation";

import { DashboardShell }
from "@/components/dashboard/DashboardShell";

import { auth }
from "@/lib/auth";

/**
 * Disable caching completely
 */
export const dynamic =
  "force-dynamic";

export const revalidate =
  0;

export const fetchCache =
  "force-no-store";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default async function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  /**
   * Check auth
   */
  const session =
    await auth();

  /**
   * Protect dashboard routes
   */
  if (!session?.user) {
    redirect(
      "/auth/signin"
    );
  }

  return (
    <DashboardShell
      user={session.user}
    >
      {children}
    </DashboardShell>
  );
}