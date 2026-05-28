/**
 * app/api/notes/[id]/summarize/route.ts
 * POST /api/notes/:id/summarize
 *
 * Accepts text extracted client-side from the PDF,
 * sends it to Gemini, and persists the summary in MongoDB.
 */

import {
  NextRequest,
  NextResponse,
} from "next/server";

import { auth }
from "@/lib/auth";

import { connectDB }
from "@/lib/mongodb";

import { summarizeText }
from "@/lib/gemini";

import Note from "@/models/Note";

type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(
  req: NextRequest,
  { params }: RouteParams
) {
  try {
    /**
     * Auth check
     */
    const session =
      await auth();

    if (
      !session?.user?.id
    ) {
      return NextResponse.json(
        {
          error:
            "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    /**
     * Get note id
     */
    const { id } =
      await params;

    /**
     * Connect DB
     */
    await connectDB();

    /**
     * Find note
     */
    const note =
      await Note.findOne({
        _id: id,
        userId:
          session.user.id,
      }).select(
        "+extractedText"
      );

    if (!note) {
      return NextResponse.json(
        {
          error:
            "Note not found",
        },
        {
          status: 404,
        }
      );
    }

    /**
     * Parse body
     */
    const body =
      await req
        .json()
        .catch(() => ({}));

    /**
     * Prefer fresh extracted text
     */
    const textToProcess =
      (
        body.extractedText ??
        note.extractedText ??
        ""
      ) as string;

    /**
     * Validate text
     */
    if (
      !textToProcess.trim()
    ) {
      return NextResponse.json(
        {
          error:
            "No readable text found. Ensure the PDF is not scanned.",
        },
        {
          status: 400,
        }
      );
    }

    console.log(
      "TEXT LENGTH:",
      textToProcess.length
    );

    /**
     * Gemini summary
     */
    const summary =
      await summarizeText(
        textToProcess
      );

    /**
     * Save summary
     */
    note.summary =
      summary;

    note.isSummarized =
      true;

    if (
      body.extractedText &&
      !note.extractedText
    ) {
      note.extractedText =
        body.extractedText;
    }

    await note.save();

    /**
     * Success response
     */
    return NextResponse.json({
      summary,
    });
  } catch (error) {
    /**
     * IMPORTANT:
     * show real Gemini/backend errors
     */
    console.error(
      "[SUMMARIZE ERROR]",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate summary",
      },
      {
        status: 500,
      }
    );
  }
}