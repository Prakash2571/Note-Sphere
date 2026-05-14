/**
 * app/api/notes/[id]/route.ts
 * GET    /api/notes/:id  — Fetch a single note with a fresh pre-signed S3 URL
 * PATCH  /api/notes/:id  — Update note title, description, or labels
 * DELETE /api/notes/:id  — Delete note from DB and S3
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { getPresignedUrl, deleteFromS3 } from "@/lib/s3";
import Note from "@/models/Note";
import Label from "@/models/Label";

// ── GET — Fetch single note ────────────────────────────────────────────────────
export async function GET(
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
      userId: session.user.id,  // Ensure user owns this note
    }).populate("labels", "name color");

    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    // Generate a fresh pre-signed URL (valid for 1 hour)
    const presignedUrl = await getPresignedUrl(note.s3Key);

    return NextResponse.json({ note, presignedUrl }, { status: 200 });
  } catch (error) {
    console.error("[GET NOTE ERROR]", error);
    return NextResponse.json({ error: "Failed to fetch note" }, { status: 500 });
  }
}

// ── PATCH — Update note metadata ───────────────────────────────────────────────
export async function PATCH(
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

    const body = await req.json();
    const { title, description, labels } = body;

    // Track old labels to update counts
    const oldLabelIds = note.labels.map((l: { toString: () => string }) => l.toString());

    // Apply updates
    if (title !== undefined) note.title = title.trim();
    if (description !== undefined) note.description = description.trim();
    if (labels !== undefined) note.labels = labels;

    await note.save();

    // ── Update label note counts ─────────────────────────────────────────────
    if (labels !== undefined) {
      // Decrement old labels
      await Label.updateMany(
        { _id: { $in: oldLabelIds } },
        { $inc: { noteCount: -1 } }
      );
      // Increment new labels
      await Label.updateMany(
        { _id: { $in: labels } },
        { $inc: { noteCount: 1 } }
      );
    }

    const updatedNote = await Note.findById(note._id).populate("labels", "name color");

    return NextResponse.json({ note: updatedNote }, { status: 200 });
  } catch (error) {
    console.error("[PATCH NOTE ERROR]", error);
    return NextResponse.json({ error: "Failed to update note" }, { status: 500 });
  }
}

// ── DELETE — Remove note from DB and S3 ───────────────────────────────────────
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

    // Delete from S3 first
    await deleteFromS3(note.s3Key);

    // Decrement label counts
    if (note.labels.length > 0) {
      await Label.updateMany(
        { _id: { $in: note.labels } },
        { $inc: { noteCount: -1 } }
      );
    }

    // Delete from MongoDB
    await Note.findByIdAndDelete(params.id);

    return NextResponse.json({ message: "Note deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("[DELETE NOTE ERROR]", error);
    return NextResponse.json({ error: "Failed to delete note" }, { status: 500 });
  }
}
