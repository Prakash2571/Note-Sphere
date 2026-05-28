import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";

import Note from "@/models/Note";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDB();

    const notes = await Note.find({
      userId: session.user.id,
      isShared: true,
    }).sort({
      createdAt: -1,
    });

    return NextResponse.json({
      notes,
    });
  } catch (error) {
    console.error(
      "[SHARED NOTES]",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to fetch shared notes",
      },
      { status: 500 }
    );
  }
}