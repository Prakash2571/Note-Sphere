/**
 * app/api/auth/[...nextauth]/route.ts
 * NextAuth catch-all route handler.
 * All auth requests (/api/auth/signin, /api/auth/callback, etc.) are handled here.
 */

import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
