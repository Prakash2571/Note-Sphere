/**
 * app/api/notes/route.ts
 * GET  /api/notes  — List all notes for the authenticated user
 * POST /api/notes  — Save metadata after a direct PDF upload to R2
 *
 * Auth.js v5: uses auth() directly — no more deprecated getServerSession(authOptions).
 * Next.js 16: route handlers are async by default.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { getObjectInfo } from "@/lib/r2";
import Note from "@/models/Note";
import Label from "@/models/Label";

// ── GET — Fetch all notes ──────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const labelId = searchParams.get("label");
    const search  = searchParams.get("search");

    // Build query — always scoped to the current user
    const query: Record<string, unknown> = { userId: session.user.id };
    if (labelId) query.labels = labelId;
    if (search)  query.title  = { $regex: search, $options: "i" };

    const notes = await Note.find(query)
      .populate("labels", "name color") // embed label name + color
      .sort({ createdAt: -1 })          // newest first
      .lean();                          // plain JS objects (faster)

    return NextResponse.json({ notes });
  } catch (error) {
    console.error("[GET NOTES]", error);
    return NextResponse.json({ error: "Failed to fetch notes" }, { status: 500 });
  }
}

// ── POST — Confirm a direct R2 upload and save its metadata ───────────────────
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const key = body?.key;
    const title = body?.title;
    const description = body?.description;
    const labels = body?.labels;

    if (typeof title !== "string" || !title.trim()) {
      return NextResponse.json({ error: "Note title is required" }, { status: 400 });
    }
    if (title.trim().length > 200 || (description !== undefined && typeof description !== "string")) {
      return NextResponse.json({ error: "Invalid note metadata" }, { status: 400 });
    }
    if (!Array.isArray(labels) || !labels.every((id: unknown) => typeof id === "string")) {
      return NextResponse.json({ error: "Invalid labels" }, { status: 400 });
    }
    const ownPrefix = "notes/" + session.user.id + "/";
    if (typeof key !== "string" || !key.startsWith(ownPrefix) ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$/i.test(key.slice(ownPrefix.length))) {
      return NextResponse.json({ error: "Invalid upload key" }, { status: 400 });
    }

    // The browser uploads directly to R2. HEAD is cheap and prevents metadata
    // from pointing to a missing, oversized, or incorrectly typed object.
    const object = await getObjectInfo("notes", key).catch(() => null);
    const fileSize = object?.ContentLength;
    if (!fileSize || fileSize > 50 * 1024 * 1024 || object.ContentType !== "application/pdf") {
      return NextResponse.json({ error: "Upload is missing or invalid" }, { status: 400 });
    }

    await connectDB();
    if (await Note.exists({ s3Key: key })) {
      return NextResponse.json({ error: "Upload has already been saved" }, { status: 409 });
    }

    const note = await Note.create({
      userId: session.user.id,
      title: title.trim(),
      description: description?.trim() ?? "",
      s3Key: key, // Legacy MongoDB field name; contains the R2 object key.
      fileSize,
      labels,
    });

    if (labels.length > 0) {
      await Label.updateMany({ _id: { $in: labels }, userId: session.user.id }, { $inc: { noteCount: 1 } });
    }

    const populated = await Note.findById(note._id).populate("labels", "name color");
    return NextResponse.json({ note: populated }, { status: 201 });
  } catch (error) {
    console.error("[POST NOTE]", error);
    return NextResponse.json({ error: "Failed to save note" }, { status: 500 });
  }
}
