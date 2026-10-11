import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { auth } from "@/lib/auth";
import { getUploadUrl } from "@/lib/r2";

const MAX_PDF_BYTES = 50 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const size = body?.size;
    const type = body?.type;
    if (type !== "application/pdf" || !Number.isInteger(size) || size < 1 || size > MAX_PDF_BYTES) {
      return NextResponse.json({ error: "A PDF under 50 MB is required" }, { status: 400 });
    }

    const key = "notes/" + session.user.id + "/" + uuidv4() + ".pdf";
    const uploadUrl = await getUploadUrl("notes", key, "application/pdf");
    return NextResponse.json({ key, uploadUrl });
  } catch (error) {
    console.error("[SIGN NOTE UPLOAD]", error);
    return NextResponse.json({ error: "Failed to prepare upload" }, { status: 500 });
  }
}
