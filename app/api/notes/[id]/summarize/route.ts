/**
 * app/api/notes/[id]/summarize/route.ts
 * POST /api/notes/:id/summarize
 *
 * Accepts text extracted client-side from the PDF,
 * sends it to Gemini, and persists the summary in MongoDB.
 *
 * Next.js 15: params is a Promise.
 * Auth.js v5: auth() replaces getServerSession.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { summarizeText } from "@/lib/gemini";
import Note from "@/models/Note";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await connectDB();

    // +extractedText re-includes the field excluded by default in the schema
    const note = await Note.findOne({ _id: id, userId: session.user.id })
      .select("+extractedText");

    if (!note) return NextResponse.json({ error: "Note not found" }, { status: 404 });

    // Prefer fresh text from request body; fall back to stored text
    const body          = await req.json().catch(() => ({}));
    const textToProcess = (body.extractedText ?? note.extractedText ?? "") as string;

    if (!textToProcess.trim()) {
      return NextResponse.json(
        { error: "No readable text found. Ensure the PDF is not a scanned image." },
        { status: 400 }
      );
    }

    // ── Call Gemini ─────────────────────────────────────────────────────────
    const summary = await summarizeText(textToProcess);

    // Persist results
    note.summary      = summary;
    note.isSummarized = true;
    if (body.extractedText && !note.extractedText) {
      note.extractedText = body.extractedText;
    }
    await note.save();

    return NextResponse.json({ summary });
  } catch (error) {
    console.error("[SUMMARIZE]", error);
    return NextResponse.json({ error: "Failed to generate summary." }, { status: 500 });
  }
}
