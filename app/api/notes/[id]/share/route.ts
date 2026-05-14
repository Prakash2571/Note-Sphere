/**
 * app/api/notes/[id]/share/route.ts
 * POST   /api/notes/:id/share   — Generate (or return existing) share token
 * DELETE /api/notes/:id/share   — Revoke the share link
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { getPresignedUrl } from "@/lib/s3";
import Note from "@/models/Note";
import { v4 as uuidv4 } from "uuid";

// ── POST — Enable sharing (generate token) ─────────────────────────────────────
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const note = await Note.findOne({
      _id: params.id,
      userId: session.user.id,
    });

    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    // Generate a new token if one doesn't exist
    if (!note.shareToken) {
      note.shareToken = uuidv4();
    }
    note.isShared = true;
    await note.save();

    const shareUrl = `${process.env.NEXTAUTH_URL}/shared/${note.shareToken}`;

    return NextResponse.json({ shareToken: note.shareToken, shareUrl }, { status: 200 });
  } catch (error) {
    console.error("[SHARE ERROR]", error);
    return NextResponse.json({ error: "Failed to generate share link" }, { status: 500 });
  }
}

// ── DELETE — Revoke share link ─────────────────────────────────────────────────
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const note = await Note.findOne({
      _id: params.id,
      userId: session.user.id,
    });

    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    note.isShared = false;
    note.shareToken = undefined;
    await note.save();

    return NextResponse.json({ message: "Share link revoked" }, { status: 200 });
  } catch (error) {
    console.error("[REVOKE SHARE ERROR]", error);
    return NextResponse.json({ error: "Failed to revoke share link" }, { status: 500 });
  }
}

// ── GET /api/shared/:token — Public access (in a separate route file) ──────────
// See: app/api/shared/[token]/route.ts
