import { randomBytes } from "crypto";
import { eq, and, isNull, gt } from "drizzle-orm";
import type { Database } from "@/lib/db/client";
import { reviewTokens } from "@/lib/db/schema";

const TOKEN_EXPIRY_HOURS = 48;

export interface TokenValidation {
  valid: boolean;
  reason?: "invalid" | "expired" | "used";
  tokenId?: string;
  userId?: string;
  spotId?: string;
}

export class ReviewTokenService {
  constructor(private db: Database) {}

  async generate(userId: string, spotId: string): Promise<string> {
    const token = randomBytes(32).toString("hex"); // 64 chars
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

    await this.db.insert(reviewTokens).values({
      userId,
      spotId,
      token,
      expiresAt,
    });

    return token;
  }

  async validate(token: string): Promise<TokenValidation> {
    const [row] = await this.db
      .select()
      .from(reviewTokens)
      .where(eq(reviewTokens.token, token))
      .limit(1);

    if (!row) {
      return { valid: false, reason: "invalid" };
    }

    if (row.usedAt) {
      return { valid: false, reason: "used" };
    }

    if (row.expiresAt < new Date()) {
      return { valid: false, reason: "expired" };
    }

    return {
      valid: true,
      tokenId: row.id,
      userId: row.userId,
      spotId: row.spotId,
    };
  }

  async markUsed(tokenId: string): Promise<void> {
    await this.db
      .update(reviewTokens)
      .set({ usedAt: new Date() })
      .where(eq(reviewTokens.id, tokenId));
  }
}
