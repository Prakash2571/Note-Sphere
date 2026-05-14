/**
 * app/api/notes/[id]/route.ts
 * GET    /api/notes/:id  — Fetch one note + fresh S3 pre-signed URL
 * PATCH  /api/notes/:id  — Update title, description, or labels
 * DELETE /api/notes/:id  — Delete from DB and S3
 *
 * Next.js 15: params is now a Promise — must be awaited before use.
 * Auth.js v5: auth() replaces getServerSession.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { getPresignedUrl, deleteFromS3 } from "@/lib/s3";
import Note from "@/models/Note";
import Label from "@/models/Label";

type RouteParams = { params: Promise<{ id: string }> };

// ── GET ────────────────────────────────────────────────────────────────────────
export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Next.js 15 — await params before destructuring
    const { id } = await params;
    await connectDB();

    const note = await Note.findOne({ _id: id, userId: session.user.id })
      .populate("labels", "name color");

    if (!note) return NextResponse.json({ error: "Note not found" }, { status: 404 });

    const presignedUrl = await getPresignedUrl(note.s3Key);
    return NextResponse.json({ note, presignedUrl });
  } catch (error) {
    console.error("[GET NOTE]", error);
    return NextResponse.json({ error: "Failed to fetch note" }, { status: 500 });
  }
}

// ── PATCH ──────────────────────────────────────────────────────────────────────
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await connectDB();

    const note = await Note.findOne({ _id: id, userId: session.user.id });
    if (!note) return NextResponse.json({ error: "Note not found" }, { status: 404 });

    const { title, description, labels } = await req.json();

    // Capture old labels before overwriting (for count updates)
    const oldLabelIds = note.labels.map((l: { toString(): string }) => l.toString());

    if (title       !== undefined) note.title       = title.trim();
    if (description !== undefined) note.description = description.trim();
    if (labels      !== undefined) note.labels      = labels;

    await note.save();

    // Keep label note-counts in sync
    if (labels !== undefined) {
      await Label.updateMany({ _id: { $in: oldLabelIds } }, { $inc: { noteCount: -1 } });
      await Label.updateMany({ _id: { $in: labels      } }, { $inc: { noteCount:  1 } });
    }

    const updated = await Note.findById(note._id).populate("labels", "name color");
    return NextResponse.json({ note: updated });
  } catch (error) {
    console.error("[PATCH NOTE]", error);
    return NextResponse.json({ error: "Failed to update note" }, { status: 500 });
  }
}

// ── DELETE ─────────────────────────────────────────────────────────────────────
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

    // Remove file from S3 first, then clean up DB
    await deleteFromS3(note.s3Key);

    if (note.labels.length > 0) {
      await Label.updateMany({ _id: { $in: note.labels } }, { $inc: { noteCount: -1 } });
    }

    await Note.findByIdAndDelete(id);
    return NextResponse.json({ message: "Note deleted successfully" });
  } catch (error) {
    console.error("[DELETE NOTE]", error);
    return NextResponse.json({ error: "Failed to delete note" }, { status: 500 });
  }
}
