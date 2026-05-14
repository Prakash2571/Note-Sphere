/**
 * app/api/shared/[token]/route.ts
 * GET /api/shared/:token
 * Public endpoint — fetches note metadata and a fresh pre-signed PDF URL
 * using just the share token (no authentication required).
 */

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getPresignedUrl } from "@/lib/s3";
import Note from "@/models/Note";

export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    await connectDB();

    const note = await Note.findOne({
      shareToken: params.token,
      isShared: true,
    }).populate("labels", "name color");

    if (!note) {
      return NextResponse.json(
        { error: "This share link is invalid or has been revoked" },
        { status: 404 }
      );
    }

    // Generate a fresh pre-signed URL for the PDF
    const presignedUrl = await getPresignedUrl(note.s3Key);

    return NextResponse.json(
      {
        note: {
          title: note.title,
          description: note.description,
          labels: note.labels,
          summary: note.summary,
          isSummarized: note.isSummarized,
          fileSize: note.fileSize,
          pageCount: note.pageCount,
          createdAt: note.createdAt,
        },
        presignedUrl,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[SHARED NOTE ERROR]", error);
    return NextResponse.json({ error: "Failed to load shared note" }, { status: 500 });
  }
}
