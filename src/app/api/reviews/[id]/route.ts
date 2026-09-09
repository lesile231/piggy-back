import { NextRequest, NextResponse } from "next/server";
import { createDb } from "@/lib/db/client";
import { getEnv } from "@/lib/env";
import { verifyAdminSession } from "@/lib/auth/admin-auth";
import { ReviewRepository } from "@/services/review/review.repository";

/**
 * PATCH /api/reviews/:id
 * Admin-only: update review status (published/hidden).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await verifyAdminSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = body as { status?: string };

    if (!status || !["published", "hidden"].includes(status)) {
      return NextResponse.json(
        { error: "status must be 'published' or 'hidden'" },
        { status: 400 },
      );
    }

    const env = getEnv();
    const db = createDb(env.DATABASE_URL);
    const repo = new ReviewRepository(db);

    await repo.updateStatus(id, status);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to update review:", err);
    return NextResponse.json({ error: "Failed to update review" }, { status: 500 });
  }
}
