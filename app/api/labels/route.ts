/**
 * app/api/labels/route.ts
 * GET  /api/labels  — List all labels for the authenticated user
 * POST /api/labels  — Create a new label
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Label from "@/models/Label";
import { randomLabelColor } from "@/lib/utils";

// ── GET — List labels ──────────────────────────────────────────────────────────
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const labels = await Label.find({ userId: session.user.id })
      .sort({ name: 1 })
      .lean();

    return NextResponse.json({ labels }, { status: 200 });
  } catch (error) {
    console.error("[GET LABELS ERROR]", error);
    return NextResponse.json({ error: "Failed to fetch labels" }, { status: 500 });
  }
}

// ── POST — Create label ────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, color } = await req.json();

    if (!name?.trim()) {
      return NextResponse.json({ error: "Label name is required" }, { status: 400 });
    }

    await connectDB();

    const label = await Label.create({
      userId: session.user.id,
      name: name.trim(),
      color: color || randomLabelColor(),
    });

    return NextResponse.json({ label }, { status: 201 });
  } catch (error: unknown) {
    // MongoDB duplicate key error
    if ((error as { code?: number }).code === 11000) {
      return NextResponse.json(
        { error: "A label with this name already exists" },
        { status: 409 }
      );
    }
    console.error("[POST LABEL ERROR]", error);
    return NextResponse.json({ error: "Failed to create label" }, { status: 500 });
  }
}
