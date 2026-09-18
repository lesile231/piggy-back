import { eq, and, or, gte, isNull, sql } from "drizzle-orm";
import type { Database } from "@/lib/db/client";
import { deals } from "@/lib/db/schema";
import type { DealRecord } from "./types";
import type { LocalizedText } from "@/types/common";

export class DealRepository {
  constructor(private db: Database) {}

  async getActive(limit = 20): Promise<DealRecord[]> {
    try {
      const now = new Date();
      const rows = await this.db
        .select()
        .from(deals)
        .where(
          and(
            eq(deals.isActive, true),
            or(isNull(deals.validUntil), gte(deals.validUntil, now)),
          ),
        )
        .orderBy(deals.sortOrder, deals.createdAt)
        .limit(limit);

      return rows.map(this.toDealRecord);
    } catch {
      return [];
    }
  }

  async getById(id: string): Promise<DealRecord | null> {
    try {
      const rows = await this.db
        .select()
        .from(deals)
        .where(eq(deals.id, id))
        .limit(1);

      if (rows.length === 0 || !rows[0]) return null;
      return this.toDealRecord(rows[0]);
    } catch {
      return null;
    }
  }

  async listAll(): Promise<DealRecord[]> {
    try {
      const rows = await this.db
        .select()
        .from(deals)
        .orderBy(deals.sortOrder, deals.createdAt);

      return rows.map(this.toDealRecord);
    } catch {
      return [];
    }
  }

  async listAllIds(): Promise<{ id: string; updatedAt: Date }[]> {
    try {
      const rows = await this.db
        .select({ id: deals.id, updatedAt: deals.updatedAt })
        .from(deals)
        .where(eq(deals.isActive, true));

      return rows.map((r) => ({ id: r.id, updatedAt: r.updatedAt }));
    } catch {
      return [];
    }
  }

  private toDealRecord(row: typeof deals.$inferSelect): DealRecord {
    return {
      id: row.id,
      nameKo: row.nameKo,
      names: (row.names ?? {}) as LocalizedText,
      description: (row.description ?? {}) as LocalizedText,
      discount: (row.discount ?? {}) as LocalizedText,
      providerName: row.providerName,
      locationName: (row.locationName ?? {}) as LocalizedText,
      addressKo: row.addressKo,
      imageUrl: row.imageUrl,
      linkUrl: row.linkUrl,
      category: row.category,
      validFrom: row.validFrom,
      validUntil: row.validUntil,
      source: row.source,
      sortOrder: row.sortOrder,
      isActive: row.isActive,
    };
  }
}
