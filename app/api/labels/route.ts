/**
 * app/api/labels/route.ts
 * GET  /api/labels  — List all labels for the authenticated user
 * POST /api/labels  — Create a new label
 *
 * Auth.js v5: auth() replaces getServerSession.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Label from "@/models/Label";
import { randomLabelColor } from "@/lib/utils";

// ── GET ────────────────────────────────────────────────────────────────────────
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const labels = await Label.find({ userId: session.user.id }).sort({ name: 1 }).lean();
    return NextResponse.json({ labels });
  } catch (error) {
    console.error("[GET LABELS]", error);
    return NextResponse.json({ error: "Failed to fetch labels" }, { status: 500 });
  }
}

// ── POST ───────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
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
      name:   name.trim(),
      color:  color ?? randomLabelColor(),
    });

    return NextResponse.json({ label }, { status: 201 });
  } catch (error: unknown) {
    if ((error as { code?: number }).code === 11000) {
      return NextResponse.json({ error: "A label with this name already exists" }, { status: 409 });
    }
    console.error("[POST LABEL]", error);
    return NextResponse.json({ error: "Failed to create label" }, { status: 500 });
  }
}
