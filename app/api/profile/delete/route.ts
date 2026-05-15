/**
 * app/api/profile/delete/route.ts
 *
 * DELETE /api/profile/delete
 * Permanently deletes the authenticated user's account and ALL their data:
 *  - Every PDF file in S3
 *  - Every Note document in MongoDB
 *  - Every Label document in MongoDB
 *  - The User document itself
 *
 * This is irreversible. The client should require a confirmation prompt.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { deleteFromS3 } from "@/lib/s3";
import User from "@/models/User";
import Note from "@/models/Note";
import Label from "@/models/Label";

export async function DELETE(_req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    await connectDB();

    // ── 1. Delete every PDF in S3 ─────────────────────────────────────────────
    // We do this first so that even if DB cleanup fails, no orphaned files remain.
    const userNotes = await Note.find({ userId }, { s3Key: 1 }).lean();

    // Run S3 deletes in parallel — failures are logged but don't block the cleanup
    await Promise.allSettled(
      userNotes.map((note) =>
        deleteFromS3(note.s3Key).catch((err) => {
          console.error(`[DELETE ACCOUNT] S3 delete failed for ${note.s3Key}`, err);
        })
      )
    );

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
