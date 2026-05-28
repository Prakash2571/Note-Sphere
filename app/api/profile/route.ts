/**
 * app/api/profile/route.ts
 *
 * GET   /api/profile  — fetch the authenticated user's profile + usage stats
 * PATCH /api/profile  — update the user's name (and optionally image URL)
 *
 * Auth.js v5: auth() replaces getServerSession.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Note from "@/models/Note";
import Label from "@/models/Label";

// ── GET ────────────────────────────────────────────────────────────────────────
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    // Fetch user (password is excluded by default thanks to select:false)
    const user = await User.findById(session.user.id).lean();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Aggregate usage stats in parallel for speed
    const [totalNotes, totalLabels, sharedNotes, storageAggregate] = await Promise.all([
      Note.countDocuments({ userId: session.user.id }),
      Label.countDocuments({ userId: session.user.id }),
      Note.countDocuments({ userId: session.user.id, isShared: true }),
      Note.aggregate([
        { $match: { userId: user._id } },
        { $group: { _id: null, totalBytes: { $sum: "$fileSize" } } },
      ]),
    ]);

    const totalBytes = storageAggregate[0]?.totalBytes ?? 0;

    return NextResponse.json({
      user: {
        id:        user._id.toString(),
        name:      user.name,
        email:     user.email,
        image:     user.image,
        provider:  user.provider,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      stats: {
        totalNotes,
        totalLabels,
        sharedNotes,
        storageBytes: totalBytes,
      },
    });
  } catch (error) {
    console.error("[GET PROFILE]", error);
    return NextResponse.json({ error: "Failed to load profile" }, { status: 500 });
  }
}

// ── PATCH ──────────────────────────────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, image } = await req.json();

    // Validate name length
    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
      }
      if (name.length > 100) {
        return NextResponse.json(
          { error: "Name cannot exceed 100 characters" },
          { status: 400 }
        );
      }
    }

    await connectDB();

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Apply updates
    if (name  !== undefined) user.name  = name.trim();
    if (image !== undefined) user.image = image;
    await user.save();

    return NextResponse.json({
      user: {
        id:    user._id.toString(),
        name:  user.name,
        email: user.email,
        image: user.image,
      },
    });
  } catch (error) {
    console.error("[PATCH PROFILE]", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
