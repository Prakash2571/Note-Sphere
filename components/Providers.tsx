/**
 * components/Providers.tsx
 * Client-side providers wrapper.
 * NextAuth's SessionProvider must be a client component.
 */

"use client";

import { SessionProvider } from "next-auth/react";

export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
