/**
 * app/api/shares/route.ts
 * POST /api/shares  — Create a share collection (bundle) from multiple notes.
 * GET  /api/shares  — List the current user's share collections (bundles).
 *
 * Auth.js v5: auth() replaces getServerSession.
 * Next.js 16: route handlers are async.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Note from "@/models/Note";
import ShareCollection from "@/models/ShareCollection";
import { v4 as uuidv4 } from "uuid";

// ── POST — create a multi-note share bundle ────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const noteIds: unknown = body?.noteIds;
    const title: unknown = body?.title;

    if (!Array.isArray(noteIds) || noteIds.length === 0) {
      return NextResponse.json(
        { error: "Select at least one PDF to share." },
        { status: 400 }
      );
    }

    await connectDB();

    // Verify every requested note actually belongs to the current user.
    const notes = await Note.find({
      _id: { $in: noteIds },
      userId: session.user.id,
    }).select("_id");

    if (notes.length === 0) {
      return NextResponse.json(
        { error: "None of the selected PDFs could be found." },
        { status: 404 }
      );
    }

    const token = uuidv4();

    const collection = await ShareCollection.create({
      userId: session.user.id,
      title:
        typeof title === "string" && title.trim()
          ? title.trim()
          : "Shared PDFs",
      token,
      notes: notes.map((n) => n._id),
    });

    const shareUrl = `${process.env.AUTH_URL}/shared/collection/${token}`;

    return NextResponse.json(
      {
        token,
        shareUrl,
        title: collection.title,
        count: notes.length,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[CREATE SHARE COLLECTION]", error);
    return NextResponse.json(
      { error: "Failed to create share link." },
      { status: 500 }
    );
  }
}

// ── GET — list the user's share bundles ────────────────────────────────────────
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const collections = await ShareCollection.find({ userId: session.user.id })
      .populate("notes", "title")
      .sort({ createdAt: -1 })
      .lean();

    interface LeanCollection {
      _id: unknown;
      title: string;
      token: string;
      notes?: Array<{ title?: string }>;
      createdAt: Date;
    }

    const shaped = (collections as unknown as LeanCollection[]).map((c) => ({
      _id: String(c._id),
      title: c.title,
      token: c.token,
      count: Array.isArray(c.notes) ? c.notes.length : 0,
      noteTitles: Array.isArray(c.notes)
        ? c.notes
            .map((n) => n?.title)
            .filter((t): t is string => Boolean(t))
        : [],
      createdAt: c.createdAt,
    }));

    return NextResponse.json({ collections: shaped });
  } catch (error) {
    console.error("[LIST SHARE COLLECTIONS]", error);
    return NextResponse.json(
      { error: "Failed to fetch share bundles." },
      { status: 500 }
    );
  }
}
