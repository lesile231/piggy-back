import { NextRequest, NextResponse } from "next/server";
import { createDb } from "@/lib/db/client";
import { getEnv } from "@/lib/env";
import { ReviewTokenService } from "@/services/review/review-token.service";

/**
 * POST /api/review-tokens
 * Body: { userId: string, spotId: string }
 *
 * Called by the chatbot to generate a review token for a messenger user.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, spotId } = body as { userId?: string; spotId?: string };

    if (!userId || !spotId) {
      return NextResponse.json(
        { error: "userId and spotId are required" },
        { status: 400 },
      );
    }

    const env = getEnv();
    const db = createDb(env.DATABASE_URL);
    const tokenService = new ReviewTokenService(db);

    const token = await tokenService.generate(userId, spotId);
    const reviewUrl = `${env.NEXT_PUBLIC_APP_URL}/en/review/${token}`;

    return NextResponse.json({ token, reviewUrl });
  } catch (err) {
    console.error("Token generation failed:", err);
    return NextResponse.json(
      { error: "Token generation failed" },
      { status: 500 },
    );
  }
}
