/**
 * components/Providers.tsx
 *
 * Client-side providers wrapper.
 *
 * Auth.js v5: SessionProvider is still imported from "next-auth/react" —
 * the import path hasn't changed for the client-side hook.
 * It now accepts an optional `basePath` prop if you customise the auth route.
 */

"use client";

import { SessionProvider } from "next-auth/react";

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    // basePath defaults to "/api/auth" — only override if you move the route
    <SessionProvider basePath="/api/auth">
      {children}
    </SessionProvider>
  );
}
