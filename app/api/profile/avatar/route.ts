/**
 * app/api/profile/avatar/route.ts
 *
 * POST /api/profile/avatar
 * Upload a new profile picture to S3 and save the URL to the user record.
 *
 * Stores avatars under: avatars/{userId}.{ext}
 * Replaces the previous avatar (S3 PUT overwrites the same key).
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { uploadToS3 } from "@/lib/s3";
import User from "@/models/User";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_AVATAR_SIZE    = 5 * 1024 * 1024; // 5 MB

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file     = formData.get("avatar") as File | null;

    // ── Validation ────────────────────────────────────────────────────────────
    if (!file) {
      return NextResponse.json({ error: "No image file provided" }, { status: 400 });
    }
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Only JPG, PNG, WebP, and GIF images are allowed" },
        { status: 400 }
      );
    }
    if (file.size > MAX_AVATAR_SIZE) {
      return NextResponse.json(
        { error: "Image size must be under 5 MB" },
        { status: 400 }
      );
    }

    // ── Upload to S3 ──────────────────────────────────────────────────────────
    // Extract extension from MIME type, e.g. "image/png" → "png"
    const extension = file.type.split("/")[1];
    const s3Key     = `avatars/${session.user.id}.${extension}`;
    const buffer    = Buffer.from(await file.arrayBuffer());

    // Cache-buster appended to URL so the browser refetches after upload
    const baseUrl     = await uploadToS3(s3Key, buffer, file.type);
    const cacheBuster = `?t=${Date.now()}`;
    const imageUrl    = `${baseUrl}${cacheBuster}`;

    // ── Persist URL to user record ────────────────────────────────────────────
    await connectDB();
    await User.findByIdAndUpdate(session.user.id, { image: imageUrl });

    return NextResponse.json({ image: imageUrl });
  } catch (error) {
    console.error("[UPLOAD AVATAR]", error);
    return NextResponse.json({ error: "Failed to upload avatar" }, { status: 500 });
  }
}
