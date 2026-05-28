/**
 * components/Providers.tsx
 *
 * Client-side providers wrapper.
 * Wraps the app with:
 *  1. Redux Provider (global state via Redux Toolkit)
 *  2. SessionProvider (Auth.js v5 session on the client)
 */

"use client";

import { Provider as ReduxProvider } from "react-redux";
import { SessionProvider } from "next-auth/react";
import { store } from "@/store";

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ReduxProvider store={store}>
      <SessionProvider basePath="/api/auth">
        {children}
      </SessionProvider>
    </ReduxProvider>
  );
}
