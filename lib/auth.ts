/**
 * lib/auth.ts
 * NextAuth configuration — supports credentials (email/password) and Google OAuth.
 * This file is imported by the NextAuth API route handler.
 */

import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

export const authOptions: NextAuthOptions = {
  // Use JWT strategy (stateless — no database sessions needed)
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  // Custom pages so we can style them
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },

  providers: [
    // ── Google OAuth ──────────────────────────────────────────────────────
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),

    // ── Email / Password ──────────────────────────────────────────────────
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        await connectDB();

        // Find user and explicitly select the password field (hidden by default)
        const user = await User.findOne({ email: credentials.email }).select("+password");

        if (!user) {
          throw new Error("No account found with this email");
        }

        if (!user.password) {
          throw new Error("This account uses Google login. Please sign in with Google.");
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

        if (!isPasswordValid) {
          throw new Error("Incorrect password");
        }

        // Return the user object that gets encoded into the JWT
        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          image: user.image ?? null,
        };
      },
    }),
  ],

  callbacks: {
    // ── signIn callback — handle Google OAuth user creation ───────────────
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        await connectDB();

        const existingUser = await User.findOne({ email: user.email });

        if (!existingUser) {
          // Create a new user record for first-time Google sign-ins
          await User.create({
            name: user.name,
            email: user.email,
            image: user.image,
            provider: "google",
          });
        }
      }
      return true;
    },

    // ── JWT callback — add userId to the token ────────────────────────────
    async jwt({ token, user, account }) {
      if (user) {
        // On first sign-in, add userId to token
        if (account?.provider === "google") {
          await connectDB();
          const dbUser = await User.findOne({ email: user.email });
          token.userId = dbUser?._id.toString();
        } else {
          token.userId = user.id;
        }
      }
      return token;
    },

    // ── Session callback — expose userId to the client ────────────────────
    async session({ session, token }) {
      if (token.userId) {
        session.user.id = token.userId as string;
      }
      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
};
