/**
 * lib/auth.ts
 * Auth.js v5 (next-auth v5) configuration.
 *
 * Key differences from v4:
 *  - Export `auth`, `signIn`, `signOut`, `handlers` directly from NextAuth()
 *  - No more `authOptions` object passed around everywhere
 *  - `auth()` replaces `getServerSession(authOptions)` in server components & API routes
 *  - Callbacks receive typed `user` and `account` objects
 */

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

export const { auth, signIn, signOut, handlers } = NextAuth({
  // ── Custom auth pages ────────────────────────────────────────────────────
  pages: {
    signIn: "/auth/signin",
    error:  "/auth/error",
  },

  // ── Session strategy: JWT (stateless, no DB sessions needed) ────────────
  session: {
    strategy: "jwt",
    maxAge:   30 * 24 * 60 * 60, // 30 days
  },

  // ── Providers ────────────────────────────────────────────────────────────
  providers: [
    // Google OAuth — Auth.js v5 automatically reads AUTH_GOOGLE_ID and
    // AUTH_GOOGLE_SECRET from the environment when you pass Google directly.
    Google,

    // Email + password credentials
    Credentials({
      name: "credentials",
      credentials: {
        email:    { label: "Email",    type: "email"    },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {
        const email    = credentials?.email    as string | undefined;
        const password = credentials?.password as string | undefined;

        if (!email || !password) {
          throw new Error("Email and password are required");
        }

        await connectDB();

        // select("+password") re-includes the field hidden by default in the schema
        const user = await User.findOne({ email: email.toLowerCase() }).select("+password");

        if (!user) {
          throw new Error("No account found with this email");
        }

        if (!user.password) {
          throw new Error("This account uses Google login — please sign in with Google.");
        }

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
          throw new Error("Incorrect password");
        }

        // Return value is encoded into the JWT on first sign-in
        return {
          id:    user._id.toString(),
          name:  user.name,
          email: user.email,
          image: user.image ?? null,
        };
      },
    }),
  ],

  // ── Callbacks ─────────────────────────────────────────────────────────────
  callbacks: {
    /**
     * signIn — runs after every successful provider sign-in.
     * Used to upsert Google users into MongoDB on first login.
     */
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        await connectDB();

        const existing = await User.findOne({ email: user.email });
        if (!existing) {
          await User.create({
            name:     user.name,
            email:    user.email,
            image:    user.image,
            provider: "google",
          });
        }
      }
      return true;
    },

    /**
     * jwt — runs whenever a JWT is created or updated.
     * We store the MongoDB user id in the token so it's available server-side.
     */
    async jwt({ token, user, account }) {
      if (user) {
        if (account?.provider === "google") {
          // For Google users we need to look up the DB id
          await connectDB();
          const dbUser = await User.findOne({ email: user.email });
          token.userId = dbUser?._id.toString();
        } else {
          token.userId = user.id;
        }
      }
      return token;
    },

    /**
     * session — shapes the session object the client receives.
     * Exposes `session.user.id` so components can use it directly.
     */
    async session({ session, token }) {
      if (token.userId) {
        session.user.id = token.userId as string;
      }
      return session;
    },
  },

  // AUTH_SECRET is automatically read from env by Auth.js v5
});
