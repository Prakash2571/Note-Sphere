/**
 * app/api/notes/[id]/share/route.ts
 * POST   /api/notes/:id/share  — Generate (or return existing) share token
 * DELETE /api/notes/:id/share  — Revoke the share link
 *
 * Next.js 15: params is a Promise.
 * Auth.js v5: auth() replaces getServerSession.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Note from "@/models/Note";
import { v4 as uuidv4 } from "uuid";

type RouteParams = { params: Promise<{ id: string }> };

// ── POST — enable sharing ──────────────────────────────────────────────────────
export async function POST(_req: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await connectDB();

    const note = await Note.findOne({ _id: id, userId: session.user.id });
    if (!note) return NextResponse.json({ error: "Note not found" }, { status: 404 });

    // Reuse existing token or create a new one
    if (!note.shareToken) note.shareToken = uuidv4();
    note.isShared = true;
    await note.save();

    const shareUrl = `${process.env.AUTH_URL ?? process.env.NEXTAUTH_URL}/shared/${note.shareToken}`;
    return NextResponse.json({ shareToken: note.shareToken, shareUrl });
  } catch (error) {
    console.error("[SHARE NOTE]", error);
    return NextResponse.json({ error: "Failed to generate share link" }, { status: 500 });
  }
}

// ── DELETE — revoke sharing ────────────────────────────────────────────────────
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await connectDB();

    const note = await Note.findOne({ _id: id, userId: session.user.id });
    if (!note) return NextResponse.json({ error: "Note not found" }, { status: 404 });

    note.isShared    = false;
    note.shareToken  = undefined;
    await note.save();

    return NextResponse.json({ message: "Share link revoked" });
  } catch (error) {
    console.error("[REVOKE SHARE]", error);
    return NextResponse.json({ error: "Failed to revoke share link" }, { status: 500 });
  }
}
