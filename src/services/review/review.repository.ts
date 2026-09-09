import { eq, and, desc, sql, count, avg } from "drizzle-orm";
import type { Database } from "@/lib/db/client";
import { reviews, users } from "@/lib/db/schema";

export interface ReviewRow {
  id: string;
  spotId: string;
  userId: string;
  rating: number;
  comment: string | null;
  images: string[];
  status: string;
  createdAt: Date;
  displayName: string;
  platform: string;
}

export interface ReviewStats {
  averageRating: number | null;
  totalCount: number;
}

export class ReviewRepository {
  constructor(private db: Database) {}

  async getBySpotId(spotId: string, limit = 20, offset = 0): Promise<ReviewRow[]> {
    const rows = await this.db
      .select({
        id: reviews.id,
        spotId: reviews.spotId,
        userId: reviews.userId,
        rating: reviews.rating,
        comment: reviews.comment,
        images: reviews.images,
        status: reviews.status,
        createdAt: reviews.createdAt,
        platform: users.platform,
        platformUid: users.platformUid,
      })
      .from(reviews)
      .innerJoin(users, eq(reviews.userId, users.id))
      .where(and(eq(reviews.spotId, spotId), eq(reviews.status, "published")))
      .orderBy(desc(reviews.createdAt))
      .limit(limit)
      .offset(offset);

    return rows.map((r) => ({
      id: r.id,
      spotId: r.spotId,
      userId: r.userId,
      rating: r.rating,
      comment: r.comment,
      images: (r.images ?? []) as string[],
      status: r.status,
      createdAt: r.createdAt,
      displayName: maskPlatformUid(r.platform, r.platformUid),
      platform: r.platform,
    }));
  }

  async getStats(spotId: string): Promise<ReviewStats> {
    const [row] = await this.db
      .select({
        averageRating: avg(reviews.rating),
        totalCount: count(),
      })
      .from(reviews)
      .where(and(eq(reviews.spotId, spotId), eq(reviews.status, "published")));

    return {
      averageRating: row?.averageRating ? parseFloat(row.averageRating) : null,
      totalCount: row?.totalCount ?? 0,
    };
  }

  async create(data: {
    spotId: string;
    userId: string;
    tokenId: string;
    rating: number;
    comment?: string;
    images?: string[];
  }): Promise<string> {
    const [row] = await this.db
      .insert(reviews)
      .values({
        spotId: data.spotId,
        userId: data.userId,
        tokenId: data.tokenId,
        rating: data.rating,
        comment: data.comment ?? null,
        images: data.images ?? [],
      })
      .returning({ id: reviews.id });

    return row!.id;
  }

  async updateStatus(reviewId: string, status: string): Promise<void> {
    await this.db
      .update(reviews)
      .set({ status, updatedAt: new Date() })
      .where(eq(reviews.id, reviewId));
  }

  async getAllForAdmin(limit = 50, offset = 0) {
    const rows = await this.db
      .select({
        id: reviews.id,
        spotId: reviews.spotId,
        userId: reviews.userId,
        rating: reviews.rating,
        comment: reviews.comment,
        images: reviews.images,
        status: reviews.status,
        createdAt: reviews.createdAt,
        platform: users.platform,
        platformUid: users.platformUid,
      })
      .from(reviews)
      .innerJoin(users, eq(reviews.userId, users.id))
      .orderBy(desc(reviews.createdAt))
      .limit(limit)
      .offset(offset);

    return rows.map((r) => ({
      id: r.id,
      spotId: r.spotId,
      userId: r.userId,
      rating: r.rating,
      comment: r.comment,
      images: (r.images ?? []) as string[],
      status: r.status,
      createdAt: r.createdAt,
      displayName: maskPlatformUid(r.platform, r.platformUid),
      platform: r.platform,
    }));
  }
}

/** Mask the platform UID for privacy: "whatsapp" + "821012345678" → "WhatsApp 8210****5678" */
function maskPlatformUid(platform: string, uid: string): string {
  const label = platform === "whatsapp" ? "WhatsApp" : platform === "line" ? "LINE" : platform;
  if (uid.length <= 6) return `${label} User`;
  const masked = uid.slice(0, 4) + "****" + uid.slice(-4);
  return `${label} ${masked}`;
}
