/**
 * app/api/notes/[id]/summarize/route.ts
 * POST /api/notes/:id/summarize
 * Sends the note's extracted text to Gemini and saves the summary to MongoDB.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { summarizeText } from "@/lib/gemini";
import Note from "@/models/Note";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    // Fetch note including the hidden extractedText field
    const note = await Note.findOne({
      _id: params.id,
      userId: session.user.id,
    }).select("+extractedText");

    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    // The extracted text can come from the request body (sent from client-side PDF parsing)
    // or from previously stored extractedText
    const body = await req.json().catch(() => ({}));
    const textToSummarize: string = body.extractedText || note.extractedText || "";

    if (!textToSummarize.trim()) {
      return NextResponse.json(
        { error: "No text available to summarize. Please ensure the PDF contains readable text." },
        { status: 400 }
      );
    }

    // Call Gemini API
    const summary = await summarizeText(textToSummarize);

    // Save summary and extracted text to the note
    note.summary = summary;
    note.isSummarized = true;
    if (body.extractedText && !note.extractedText) {
      note.extractedText = body.extractedText;
    }
    await note.save();

    return NextResponse.json({ summary }, { status: 200 });
  } catch (error) {
    console.error("[SUMMARIZE ERROR]", error);
    return NextResponse.json(
      { error: "Failed to generate summary. Please try again." },
      { status: 500 }
    );
  }
}
