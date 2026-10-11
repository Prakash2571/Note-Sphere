import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { avatarPublicUrl, deleteObject, getObjectInfo, ownedAvatarKey } from "@/lib/r2";
import User from "@/models/User";

const EXTENSIONS: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const key = body?.key;
    const prefix = "avatars/" + session.user.id + "/";
    if (typeof key !== "string" || !key.startsWith(prefix)) {
      return NextResponse.json({ error: "Invalid upload key" }, { status: 400 });
    }
    const match = key.slice(prefix.length).match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp|gif)$/i);
    if (!match) {
      return NextResponse.json({ error: "Invalid upload key" }, { status: 400 });
    }

    const object = await getObjectInfo("avatars", key).catch(() => null);
    if (!object?.ContentLength || object.ContentLength > 5 * 1024 * 1024 ||
        object.ContentType !== EXTENSIONS[match[1].toLowerCase()]) {
      return NextResponse.json({ error: "Upload is missing or invalid" }, { status: 400 });
    }

    const image = avatarPublicUrl(key);
    await connectDB();
    const user = await User.findById(session.user.id);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    const previousKey = ownedAvatarKey(user.image, session.user.id);
    user.image = image;
    await user.save();

    if (previousKey && previousKey !== key) {
      await deleteObject("avatars", previousKey).catch((error) =>
        console.error("[DELETE OLD AVATAR]", error)
      );
    }

    return NextResponse.json({ image });
  } catch (error) {
    console.error("[SAVE AVATAR]", error);
    return NextResponse.json({ error: "Failed to save avatar" }, { status: 500 });
  }
}
