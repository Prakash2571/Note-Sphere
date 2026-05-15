/**
 * app/api/profile/password/route.ts
 *
 * POST /api/profile/password
 * Change the password for credentials-based accounts.
 * Requires the current password for verification.
 *
 * Google OAuth users cannot change their password here — they manage it
 * in their Google account.
 */

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { currentPassword, newPassword } = await req.json();

    // ── Validation ────────────────────────────────────────────────────────────
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Current and new password are required" },
        { status: 400 }
      );
    }
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "New password must be at least 8 characters" },
        { status: 400 }
      );
    }
    if (currentPassword === newPassword) {
      return NextResponse.json(
        { error: "New password must be different from current password" },
        { status: 400 }
      );
    }

    await connectDB();

    // Re-include the hidden password field
    const user = await User.findById(session.user.id).select("+password");
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Google users have no password — they can't change it here
    if (user.provider !== "credentials" || !user.password) {
      return NextResponse.json(
        { error: "Password change is only available for email/password accounts" },
        { status: 400 }
      );
    }

    // Verify current password
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 400 }
      );
    }

    // Hash and save the new password
    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();

    return NextResponse.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("[CHANGE PASSWORD]", error);
    return NextResponse.json({ error: "Failed to change password" }, { status: 500 });
  }
}
