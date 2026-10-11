import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { auth } from "@/lib/auth";
import { getUploadUrl } from "@/lib/r2";

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const size = body?.size;
    const type = body?.type;
    if (!EXTENSIONS[type] || !Number.isInteger(size) || size < 1 || size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "An image under 5 MB is required" }, { status: 400 });
    }

    const key = "avatars/" + session.user.id + "/" + uuidv4() + "." + EXTENSIONS[type];
    const uploadUrl = await getUploadUrl("avatars", key, type);
    return NextResponse.json({ key, uploadUrl });
  } catch (error) {
    console.error("[SIGN AVATAR UPLOAD]", error);
    return NextResponse.json({ error: "Failed to prepare upload" }, { status: 500 });
  }
}
