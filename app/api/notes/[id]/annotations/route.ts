/**
 * app/api/notes/[id]/annotations/route.ts
 * GET    /api/notes/:id/annotations  — List all annotations for a note (owner-scoped)
 * POST   /api/notes/:id/annotations  — Create one annotation (validated)
 * DELETE /api/notes/:id/annotations  — Revert / clear-all annotations for a note
 *
 * Next.js 16: params is a Promise — must be awaited before use.
 * Auth.js v5: auth() replaces the deprecated getServerSession.
 *
 * The Source_PDF in R2 is never written by this handler (Req 3.3) — it imports
 * no storage write helper.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Note from "@/models/Note";
import Annotation from "@/models/Annotation";
import { validateAnnotationInput } from "@/lib/annotations/validation";

type RouteParams = { params: Promise<{ id: string }> };

const MAX_ANNOTATIONS = 5000;

// ── GET ──────────────────────────────────────────────────────────────────────
export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await connectDB();

    // Ownership check — scopes all access to the authenticated owner (Req 2.4/2.6)
    const note = await Note.findOne({ _id: id, userId: session.user.id });
    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    const annotations = await Annotation.find({
      noteId: id,
      userId: session.user.id,
    })
      .sort({ createdAt: 1 })
      .limit(MAX_ANNOTATIONS)
      .lean();

    return NextResponse.json({ annotations });
  } catch (error) {
    console.error("[GET ANNOTATIONS]", error);
    return NextResponse.json(
      { error: "Failed to fetch annotations" },
      { status: 500 }
    );
  }
}

// ── POST ─────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await connectDB();

    const note = await Note.findOne({ _id: id, userId: session.user.id });
    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    const body = await req.json();

    // Validate against palette / coordinate / page rules before any write.
    const pageCount =
      typeof note.pageCount === "number" ? note.pageCount : 0;
    const result = validateAnnotationInput(body, pageCount);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const annotation = await Annotation.create({
      userId: session.user.id,
      noteId: id,
      type: body.type,
      pageNumber: body.pageNumber,
      color: body.color,
      rects: body.type === "highlight" ? body.rects : [],
      points: body.type === "scribble" ? body.points : [],
      ...(body.type === "scribble" ? { strokeWidth: body.strokeWidth } : {}),
    });

    return NextResponse.json({ annotation }, { status: 201 });
  } catch (error) {
    console.error("[POST ANNOTATION]", error);
    return NextResponse.json(
      { error: "Failed to create annotation" },
      { status: 500 }
    );
  }
}

// ── DELETE (revert / clear-all) ────────────────────────────────────────────────
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await connectDB();

    const note = await Note.findOne({ _id: id, userId: session.user.id });
    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    const result = await Annotation.deleteMany({
      noteId: id,
      userId: session.user.id,
    });

    return NextResponse.json({ deletedCount: result.deletedCount ?? 0 });
  } catch (error) {
    console.error("[DELETE ANNOTATIONS]", error);
    return NextResponse.json(
      { error: "Failed to clear annotations" },
      { status: 500 }
    );
  }
}
