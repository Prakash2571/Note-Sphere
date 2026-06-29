/**
 * app/api/shares/[token]/route.ts
 * DELETE /api/shares/:token  — Revoke (delete) a share collection bundle.
 *
 * Only the owner can revoke. Next.js 16: params is a Promise.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import ShareCollection from "@/models/ShareCollection";

type RouteParams = { params: Promise<{ token: string }> };

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { token } = await params;
    await connectDB();

    const deleted = await ShareCollection.findOneAndDelete({
      token,
      userId: session.user.id,
    });

    if (!deleted) {
      return NextResponse.json(
        { error: "Share bundle not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Share bundle revoked." });
  } catch (error) {
    console.error("[REVOKE SHARE COLLECTION]", error);
    return NextResponse.json(
      { error: "Failed to revoke share bundle." },
      { status: 500 }
    );
  }
}
