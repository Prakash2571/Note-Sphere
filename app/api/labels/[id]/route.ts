/**
 * app/api/labels/[id]/route.ts
 * PATCH  /api/labels/:id  — Update label name or color
 * DELETE /api/labels/:id  — Delete label and remove it from all notes
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Label from "@/models/Label";
import Note from "@/models/Note";

// ── PATCH — Update label ───────────────────────────────────────────────────────
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

    const label = await Label.findOne({
      _id: params.id,
      userId: session.user.id,
    });

    if (!label) {
      return NextResponse.json({ error: "Label not found" }, { status: 404 });
    }

    const { name, color } = await req.json();

    if (name !== undefined) label.name = name.trim();
    if (color !== undefined) label.color = color;

    await label.save();

    return NextResponse.json({ label }, { status: 200 });
  } catch (error) {
    console.error("[PATCH LABEL ERROR]", error);
    return NextResponse.json({ error: "Failed to update label" }, { status: 500 });
  }
}

// ── DELETE — Delete label ──────────────────────────────────────────────────────
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

    const label = await Label.findOne({
      _id: params.id,
      userId: session.user.id,
    });

    if (!label) {
      return NextResponse.json({ error: "Label not found" }, { status: 404 });
    }

    // Remove this label from all notes that reference it
    await Note.updateMany(
      { userId: session.user.id, labels: params.id },
      { $pull: { labels: params.id } }
    );

    await Label.findByIdAndDelete(params.id);

    return NextResponse.json({ message: "Label deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("[DELETE LABEL ERROR]", error);
    return NextResponse.json({ error: "Failed to delete label" }, { status: 500 });
  }
}
