/**
 * app/api/notes/route.ts
 * GET  /api/notes  — List all notes for the authenticated user
 * POST /api/notes  — Upload a new PDF note to S3 and save metadata to MongoDB
 *
 * Auth.js v5: uses auth() directly — no more getServerSession(authOptions).
 * Next.js 15: route handlers are async by default; no special changes needed here.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { uploadToS3 } from "@/lib/s3";
import Note from "@/models/Note";
import Label from "@/models/Label";
import { v4 as uuidv4 } from "uuid";

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

// ── POST — Upload a new note ───────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData    = await req.formData();
    const file        = formData.get("file")        as File   | null;
    const title       = formData.get("title")       as string | null;
    const description = formData.get("description") as string | null;
    const labelsJson  = formData.get("labels")      as string | null;

    // ── Validation ─────────────────────────────────────────────────────────
    if (!file)          return NextResponse.json({ error: "PDF file is required" },  { status: 400 });
    if (!title?.trim()) return NextResponse.json({ error: "Note title is required" },{ status: 400 });

    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Only PDF files are allowed" }, { status: 400 });
    }

    const MAX_BYTES = 50 * 1024 * 1024; // 50 MB
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File size must be under 50 MB" }, { status: 400 });
    }

    // ── Upload to S3 ────────────────────────────────────────────────────────
    const buffer = Buffer.from(await file.arrayBuffer());
    const s3Key  = `notes/${session.user.id}/${uuidv4()}.pdf`;
    const s3Url  = await uploadToS3(s3Key, buffer, "application/pdf");

    // ── Parse optional label ids ────────────────────────────────────────────
    let labelIds: string[] = [];
    if (labelsJson) {
      try { labelIds = JSON.parse(labelsJson); } catch { /* ignore */ }
    }

    await connectDB();

    // ── Persist note metadata ───────────────────────────────────────────────
    const note = await Note.create({
      userId:      session.user.id,
      title:       title.trim(),
      description: description?.trim() ?? "",
      s3Key,
      s3Url,
      fileSize: file.size,
      labels:   labelIds,
    });

    // Bump noteCount on every assigned label
    if (labelIds.length > 0) {
      await Label.updateMany({ _id: { $in: labelIds } }, { $inc: { noteCount: 1 } });
    }

    const populated = await Note.findById(note._id).populate("labels", "name color");
    return NextResponse.json({ note: populated }, { status: 201 });
  } catch (error) {
    console.error("[POST NOTE]", error);
    return NextResponse.json({ error: "Failed to upload note" }, { status: 500 });
  }
}
