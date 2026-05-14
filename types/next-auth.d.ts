/**
 * types/next-auth.d.ts
 *
 * Augments Auth.js v5 types to include our custom fields.
 *
 * Auth.js v5 uses a flat `DefaultSession["user"]` type.
 * We add `id` so that `session.user.id` is typed everywhere
 * without casting.
 */

import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"]; // keeps name, email, image
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
  }
}
