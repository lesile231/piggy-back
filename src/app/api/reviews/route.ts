import { NextRequest, NextResponse } from "next/server";
import { createDb } from "@/lib/db/client";
import { getEnv } from "@/lib/env";
import { ReviewRepository } from "@/services/review/review.repository";
import { ReviewTokenService } from "@/services/review/review-token.service";

/**
 * GET /api/reviews?spotId=xxx
 * List published reviews for a spot.
 */
export async function GET(request: NextRequest) {
  const spotId = request.nextUrl.searchParams.get("spotId");
  if (!spotId) {
    return NextResponse.json({ error: "spotId is required" }, { status: 400 });
  }

  try {
    const env = getEnv();
    const db = createDb(env.DATABASE_URL);
    const repo = new ReviewRepository(db);

    const [reviewRows, stats] = await Promise.all([
      repo.getBySpotId(spotId),
      repo.getStats(spotId),
    ]);

    return NextResponse.json({ reviews: reviewRows, stats });
  } catch (err) {
    console.error("Failed to fetch reviews:", err);
    return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 });
  }
}

/**
 * POST /api/reviews
 * Body: { token: string, rating: number, comment?: string, images?: string[] }
 * Submit a review using a valid review token.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, rating, comment, images } = body as {
      token?: string;
      rating?: number;
      comment?: string;
      images?: string[];
    };

    if (!token || !rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "Valid token and rating (1-5) are required" },
        { status: 400 },
      );
    }

    const env = getEnv();
    const db = createDb(env.DATABASE_URL);
    const tokenService = new ReviewTokenService(db);
    const repo = new ReviewRepository(db);

    // Validate token
    const validation = await tokenService.validate(token);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.reason },
        { status: 403 },
      );
    }

    // Create review
    const reviewId = await repo.create({
      spotId: validation.spotId!,
      userId: validation.userId!,
      tokenId: validation.tokenId!,
      rating,
      comment: comment?.trim() || undefined,
      images: images?.slice(0, 3),
    });

    // Mark token as used
    await tokenService.markUsed(validation.tokenId!);

    return NextResponse.json({ id: reviewId }, { status: 201 });
  } catch (err: unknown) {
    // Handle unique constraint violation (user already reviewed this spot)
    if (err instanceof Error && err.message.includes("uq_reviews_spot_user")) {
      return NextResponse.json(
        { error: "You have already reviewed this place" },
        { status: 409 },
      );
    }
    console.error("Failed to create review:", err);
    return NextResponse.json({ error: "Failed to create review" }, { status: 500 });
  }
}
