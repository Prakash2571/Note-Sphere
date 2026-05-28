/**
 * app/api/auth/[...nextauth]/route.ts
 *
 * Auth.js v5 route handler for Next.js 16.
 *
 * Auth.js v5 exports a `handlers` object from NextAuth() containing
 * { GET, POST }. We destructure and re-export them here so that Next.js
 * picks them up as the route's HTTP method handlers.
 */

import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
