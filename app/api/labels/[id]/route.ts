/**
 * app/api/labels/[id]/route.ts
 * PATCH  /api/labels/:id  — Update label name or color
 * DELETE /api/labels/:id  — Delete label and detach from all notes
 *
 * Next.js 15: params is a Promise.
 * Auth.js v5: auth() replaces getServerSession.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Label from "@/models/Label";
import Note from "@/models/Note";

type RouteParams = { params: Promise<{ id: string }> };

// ── PATCH ──────────────────────────────────────────────────────────────────────
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await connectDB();

    const label = await Label.findOne({ _id: id, userId: session.user.id });
    if (!label) return NextResponse.json({ error: "Label not found" }, { status: 404 });

    const { name, color } = await req.json();
    if (name  !== undefined) label.name  = name.trim();
    if (color !== undefined) label.color = color;

    await label.save();
    return NextResponse.json({ label });
  } catch (error) {
    console.error("[PATCH LABEL]", error);
    return NextResponse.json({ error: "Failed to update label" }, { status: 500 });
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

    const label = await Label.findOne({ _id: id, userId: session.user.id });
    if (!label) return NextResponse.json({ error: "Label not found" }, { status: 404 });

    // Remove label reference from all notes before deleting
    await Note.updateMany(
      { userId: session.user.id, labels: id },
      { $pull: { labels: id } }
    );

    await Label.findByIdAndDelete(id);
    return NextResponse.json({ message: "Label deleted successfully" });
  } catch (error) {
    console.error("[DELETE LABEL]", error);
    return NextResponse.json({ error: "Failed to delete label" }, { status: 500 });
  }
}
