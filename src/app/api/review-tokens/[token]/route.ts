import { NextRequest, NextResponse } from "next/server";
import { createDb } from "@/lib/db/client";
import { getEnv } from "@/lib/env";
import { ReviewTokenService } from "@/services/review/review-token.service";

/**
 * GET /api/review-tokens/:token
 * Validate a review token and return associated userId/spotId.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    const env = getEnv();
    const db = createDb(env.DATABASE_URL);
    const tokenService = new ReviewTokenService(db);

    const result = await tokenService.validate(token);
    return NextResponse.json(result);
  } catch (err) {
    console.error("Token validation failed:", err);
    return NextResponse.json(
      { error: "Validation failed" },
      { status: 500 },
    );
  }
}
