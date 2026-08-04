import { eq, ilike, or, sql } from "drizzle-orm";
import type { Database } from "@/lib/db/client";
import { tourismSpots } from "@/lib/db/schema";
import type { TourismSpotExternal } from "@/lib/external/tourism/types";
import type { SpotRecord } from "./types";
import type { LocalizedText } from "@/types/common";

export class SpotRepository {
  constructor(private db: Database) {}

  async searchByName(query: string, limit = 10): Promise<SpotRecord[]> {
    try {
      const pattern = `%${query}%`;
      const rows = await this.db
        .select()
        .from(tourismSpots)
        .where(
          or(
            ilike(tourismSpots.nameKo, pattern),
            sql`${tourismSpots.names}::text ILIKE ${pattern}`,
          ),
        )
        .limit(limit);

      return rows.map(this.toSpotRecord);
    } catch {
      return [];
    }
  }

  async searchByCategory(category: string, limit = 10): Promise<SpotRecord[]> {
    try {
      const rows = await this.db
        .select()
        .from(tourismSpots)
        .where(eq(tourismSpots.isActive, true))
        .limit(limit);

      // Filter by category from tags JSONB
      return rows
        .filter((r) => {
          const tags = (r.tags ?? []) as string[];
          return tags.includes(category);
        })
        .map(this.toSpotRecord);
    } catch {
      return [];
    }
  }

  async getById(id: string): Promise<SpotRecord | null> {
    try {
      const rows = await this.db
        .select()
        .from(tourismSpots)
        .where(eq(tourismSpots.id, id))
        .limit(1);

      if (rows.length === 0 || !rows[0]) return null;
      return this.toSpotRecord(rows[0]);
    } catch {
      return null;
    }
  }

  async searchBySimilarity(
    embedding: number[],
    threshold = 0.8,
    limit = 3,
  ): Promise<(SpotRecord & { similarity: number })[]> {
    try {
      const vectorStr = `[${embedding.join(",")}]`;
      const rows = await this.db.execute(sql`
        SELECT *, 1 - (embedding <=> ${vectorStr}::vector) as similarity
        FROM tourism_spots
        WHERE is_active = true
          AND embedding IS NOT NULL
          AND 1 - (embedding <=> ${vectorStr}::vector) >= ${threshold}
        ORDER BY embedding <=> ${vectorStr}::vector
        LIMIT ${limit}
      `);

      return (rows.rows as unknown[]).map((row: unknown) => {
        const r = row as Record<string, unknown>;
        return {
          ...this.toSpotRecordFromRaw(r),
          similarity: Number(r.similarity),
        };
      });
    } catch {
      return [];
    }
  }

  async upsertFromExternal(
    spot: TourismSpotExternal,
    source: string,
  ): Promise<SpotRecord> {
    const nameKo = spot.names.ko ?? spot.names.en ?? Object.values(spot.names)[0] ?? "";
    const addressKo = spot.address.ko ?? spot.address.en ?? null;

    const rows = await this.db
      .insert(tourismSpots)
      .values({
        googlePlaceId: spot.externalId,
        nameKo,
        names: spot.names as Record<string, unknown>,
        description: spot.description as Record<string, unknown>,
        addressKo,
        addresses: spot.address as Record<string, unknown>,
        latitude: spot.latitude.toString(),
        longitude: spot.longitude.toString(),
        phone: spot.phone ?? null,
        website: spot.website ?? null,
        images: spot.images as unknown[],
        rating: spot.rating?.toString() ?? null,
        source,
        isActive: true,
      })
      .returning();

    return this.toSpotRecord(rows[0]!);
  }

  private toSpotRecord(row: typeof tourismSpots.$inferSelect): SpotRecord {
    return {
      id: row.id,
      nameKo: row.nameKo,
      names: (row.names ?? {}) as LocalizedText,
      description: (row.description ?? {}) as LocalizedText,
      addressKo: row.addressKo,
      addresses: (row.addresses ?? {}) as LocalizedText,
      latitude: row.latitude ? Number(row.latitude) : null,
      longitude: row.longitude ? Number(row.longitude) : null,
      phone: row.phone,
      website: row.website,
      images: (row.images ?? []) as string[],
      rating: row.rating ? Number(row.rating) : null,
      source: row.source,
      isActive: row.isActive,
    };
  }

  private toSpotRecordFromRaw(row: Record<string, unknown>): SpotRecord {
    return {
      id: row.id as string,
      nameKo: row.name_ko as string,
      names: (row.names ?? {}) as LocalizedText,
      description: (row.description ?? {}) as LocalizedText,
      addressKo: (row.address_ko as string) ?? null,
      addresses: (row.addresses ?? {}) as LocalizedText,
      latitude: row.latitude ? Number(row.latitude) : null,
      longitude: row.longitude ? Number(row.longitude) : null,
      phone: (row.phone as string) ?? null,
      website: (row.website as string) ?? null,
      images: (row.images ?? []) as string[],
      rating: row.rating ? Number(row.rating) : null,
      source: row.source as string,
      isActive: Boolean(row.is_active),
    };
  }
}
