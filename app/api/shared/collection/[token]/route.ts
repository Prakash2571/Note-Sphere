/**
 * app/api/shared/collection/[token]/route.ts
 * GET /api/shared/collection/:token  — Public endpoint, no auth required.
 *
 * Resolves a share bundle token to every PDF it contains, returning metadata
 * plus a fresh private preview URL for each PDF.
 *
 * Next.js 16: params is a Promise.
 */

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getPresignedUrl } from "@/lib/r2";
import ShareCollection from "@/models/ShareCollection";
// Importing these ensures the referenced models are registered before populate.
import Note from "@/models/Note";
import "@/models/Label";

type RouteParams = { params: Promise<{ token: string }> };

interface PopulatedLabel {
  _id: unknown;
  name: string;
  color: string;
}

interface PopulatedNote {
  _id: unknown;
  title: string;
  description?: string;
  s3Key: string;
  fileSize: number;
  pageCount?: number;
  labels?: PopulatedLabel[];
  summary?: string;
  isSummarized?: boolean;
  createdAt: Date;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params;
    await connectDB();

    // Touch the Note model so TypeScript/bundlers keep the import.
    void Note;

    const collection = await ShareCollection.findOne({ token }).populate({
      path: "notes",
      select:
        "title description s3Key fileSize pageCount labels summary isSummarized createdAt",
      populate: { path: "labels", select: "name color" },
    });

    if (!collection) {
      return NextResponse.json(
        { error: "This share link is invalid or has been revoked." },
        { status: 404 }
      );
    }

    const rawNotes = (collection.notes ?? []) as unknown as PopulatedNote[];

    const notes = await Promise.all(
      rawNotes.map(async (note) => {
        const previewUrl = await getPresignedUrl(note.s3Key);

        return {
          _id: String(note._id),
          title: note.title,
          description: note.description ?? "",
          labels: (note.labels ?? []).map((l) => ({
            _id: String(l._id),
            name: l.name,
            color: l.color,
          })),
          summary: note.summary,
          isSummarized: Boolean(note.isSummarized),
          fileSize: note.fileSize,
          pageCount: note.pageCount,
          createdAt: note.createdAt,
          previewUrl,
        };
      })
    );

    return NextResponse.json({
      title: collection.title,
      count: notes.length,
      createdAt: collection.createdAt,
      notes,
    });
  } catch (error) {
    console.error("[SHARED COLLECTION]", error);
    return NextResponse.json(
      { error: "Failed to load shared PDFs." },
      { status: 500 }
    );
  }
}
