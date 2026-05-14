/**
 * app/api/notes/route.ts
 * GET  /api/notes  — List all notes for the authenticated user (with label filter support)
 * POST /api/notes  — Upload a new PDF note to S3 and save metadata to MongoDB
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { uploadToS3 } from "@/lib/s3";
import Note from "@/models/Note";
import Label from "@/models/Label";
import { v4 as uuidv4 } from "uuid";

// ── GET — Fetch all notes ──────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const labelId = searchParams.get("label");
    const search = searchParams.get("search");

    // Build query — always filter by current user
    const query: Record<string, unknown> = { userId: session.user.id };

    if (labelId) {
      query.labels = labelId;
    }

    if (search) {
      query.title = { $regex: search, $options: "i" };
    }

    const notes = await Note.find(query)
      .populate("labels", "name color")   // Include label name and color
      .sort({ createdAt: -1 })            // Newest first
      .lean();                            // Return plain JS objects (faster)

    return NextResponse.json({ notes }, { status: 200 });
  } catch (error) {
    console.error("[GET NOTES ERROR]", error);
    return NextResponse.json({ error: "Failed to fetch notes" }, { status: 500 });
  }
}

// ── POST — Upload a new note ───────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse the multipart form data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const labelsJson = formData.get("labels") as string;

    // ── Validation ──────────────────────────────────────────────────────────
    if (!file) {
      return NextResponse.json({ error: "PDF file is required" }, { status: 400 });
    }

    if (!title?.trim()) {
      return NextResponse.json({ error: "Note title is required" }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Only PDF files are allowed" }, { status: 400 });
    }

    const MAX_SIZE_MB = 50;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return NextResponse.json(
        { error: `File size must be under ${MAX_SIZE_MB}MB` },
        { status: 400 }
      );
    }

    // ── Upload to S3 ─────────────────────────────────────────────────────────
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const uniqueId = uuidv4();
    const s3Key = `notes/${session.user.id}/${uniqueId}.pdf`;

    const s3Url = await uploadToS3(s3Key, fileBuffer, "application/pdf");

    // ── Parse labels ─────────────────────────────────────────────────────────
    let labelIds: string[] = [];
    if (labelsJson) {
      try {
        labelIds = JSON.parse(labelsJson);
      } catch {
        labelIds = [];
      }
    }

    await connectDB();

    // ── Save note metadata to MongoDB ─────────────────────────────────────────
    const note = await Note.create({
      userId: session.user.id,
      title: title.trim(),
      description: description?.trim() || "",
      s3Key,
      s3Url,
      fileSize: file.size,
      labels: labelIds,
    });

    // ── Update note count on each label ───────────────────────────────────────
    if (labelIds.length > 0) {
      await Label.updateMany(
        { _id: { $in: labelIds } },
        { $inc: { noteCount: 1 } }
      );
    }

    const populatedNote = await Note.findById(note._id).populate("labels", "name color");

    return NextResponse.json({ note: populatedNote }, { status: 201 });
  } catch (error) {
    console.error("[POST NOTE ERROR]", error);
    return NextResponse.json({ error: "Failed to upload note" }, { status: 500 });
  }
}
