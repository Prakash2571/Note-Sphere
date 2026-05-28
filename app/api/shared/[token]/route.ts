/**
 * app/api/shared/[token]/route.ts
 * GET /api/shared/:token  — Public endpoint, no auth required.
 *
 * Returns note metadata + a fresh pre-signed S3 URL for the PDF.
 * Next.js 15: params is a Promise.
 */

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getPresignedUrl } from "@/lib/s3";
import Note from "@/models/Note";

type RouteParams = { params: Promise<{ token: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params;
    await connectDB();

    const note = await Note.findOne({ shareToken: token, isShared: true })
      .populate("labels", "name color");

    if (!note) {
      return NextResponse.json(
        { error: "This share link is invalid or has been revoked." },
        { status: 404 }
      );
    }

    const presignedUrl = await getPresignedUrl(note.s3Key);

    return NextResponse.json({
      note: {
        title:        note.title,
        description:  note.description,
        labels:       note.labels,
        summary:      note.summary,
        isSummarized: note.isSummarized,
        fileSize:     note.fileSize,
        pageCount:    note.pageCount,
        createdAt:    note.createdAt,
      },
      presignedUrl,
    });
  } catch (error) {
    console.error("[SHARED NOTE]", error);
    return NextResponse.json({ error: "Failed to load shared note." }, { status: 500 });
  }
}
