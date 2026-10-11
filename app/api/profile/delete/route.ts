/**
 * app/api/profile/delete/route.ts
 *
 * DELETE /api/profile/delete
 * Permanently deletes the authenticated user's account and ALL their data:
 *  - Every PDF file in R2
 *  - Every Note document in MongoDB
 *  - Every Label document in MongoDB
 *  - The User document itself
 *
 * This is irreversible. The client should require a confirmation prompt.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { deleteObject, ownedAvatarKey } from "@/lib/r2";
import User from "@/models/User";
import Note from "@/models/Note";
import Label from "@/models/Label";

export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    await connectDB();

    // ── 1. Delete every PDF in R2 ─────────────────────────────────────────────
    // We do this first so that even if DB cleanup fails, no orphaned files remain.
    const userNotes = await Note.find({ userId }, { s3Key: 1 }).lean();

    // A failed delete must stop account removal, so files can be retried.
    await Promise.all(userNotes.map((note) => deleteObject("notes", note.s3Key)));

    const currentUser = await User.findById(userId).lean();
    const avatarKey = ownedAvatarKey(currentUser?.image, userId);
    if (avatarKey) {
      await deleteObject("avatars", avatarKey);
    }

    // ── 2. Delete all Mongo documents owned by the user ──────────────────────
    await Promise.all([
      Note.deleteMany({ userId }),
      Label.deleteMany({ userId }),
    ]);

    // ── 3. Delete the user record itself ──────────────────────────────────────
    await User.findByIdAndDelete(userId);

    return NextResponse.json({ message: "Account deleted successfully" });
  } catch (error) {
    console.error("[DELETE ACCOUNT]", error);
    return NextResponse.json(
      { error: "Failed to delete account. Please try again." },
      { status: 500 }
    );
  }
}
