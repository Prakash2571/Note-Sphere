/**
 * app/api/notes/[id]/annotations/[annotationId]/route.ts
 * DELETE /api/notes/:id/annotations/:annotationId — Delete a single annotation.
 *
 * Next.js 16: params is a Promise — must be awaited before use.
 * Auth.js v5: auth() replaces the deprecated getServerSession.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Note from "@/models/Note";
import Annotation from "@/models/Annotation";

type RouteParams = {
  params: Promise<{ id: string; annotationId: string }>;
};

// ── DELETE (single) ────────────────────────────────────────────────────────────
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, annotationId } = await params;
    await connectDB();

    // Ownership check — scopes access to the authenticated owner (Req 2.4/2.6)
    const note = await Note.findOne({ _id: id, userId: session.user.id });
    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    const deleted = await Annotation.findOneAndDelete({
      _id: annotationId,
      noteId: id,
      userId: session.user.id,
    });

    if (!deleted) {
      return NextResponse.json(
        { error: "Annotation not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Annotation deleted successfully" });
  } catch (error) {
    console.error("[DELETE ANNOTATION]", error);
    return NextResponse.json(
      { error: "Failed to delete annotation" },
      { status: 500 }
    );
  }
}
