import { eq, and, gte, gt, lte, between, sql } from "drizzle-orm";
import type { Database } from "@/lib/db/client";
import { events } from "@/lib/db/schema";
import type { EventRecord } from "./types";
import type { LocalizedText } from "@/types/common";

export class EventRepository {
  constructor(private db: Database) {}

  async getActiveEvents(
    options?: { date?: Date; category?: string; limit?: number },
  ): Promise<EventRecord[]> {
    try {
      const conditions = [eq(events.isActive, true)];

      if (options?.date) {
        conditions.push(lte(events.startsAt, options.date));
        conditions.push(gte(events.endsAt, options.date));
      }

      if (options?.category) {
        conditions.push(eq(events.category, options.category));
      }

      const rows = await this.db
        .select()
        .from(events)
        .where(and(...conditions))
        .orderBy(events.startsAt)
        .limit(options?.limit ?? 10);

      return rows.map(this.toEventRecord);
    } catch {
      return [];
    }
  }

  async getOngoingEvents(limit = 10): Promise<EventRecord[]> {
    try {
      const now = new Date();
      const rows = await this.db
        .select()
        .from(events)
        .where(
          and(
            eq(events.isActive, true),
            lte(events.startsAt, now),
            gte(events.endsAt, now),
          ),
        )
        .orderBy(events.startsAt)
        .limit(limit);

      return rows.map(this.toEventRecord);
    } catch {
      return [];
    }
  }

  async getUpcomingEvents(limit = 5): Promise<EventRecord[]> {
    try {
      const now = new Date();
      const rows = await this.db
        .select()
        .from(events)
        .where(and(eq(events.isActive, true), gt(events.startsAt, now)))
        .orderBy(events.startsAt)
        .limit(limit);

      return rows.map(this.toEventRecord);
    } catch {
      return [];
    }
  }

  /**
   * Get upcoming events near a given coordinate (within ~2km radius).
   */
  async getNearbyUpcomingEvents(
    lat: number,
    lng: number,
    limit = 3,
  ): Promise<EventRecord[]> {
    try {
      const delta = 0.02; // ~2.2km at Korea's latitude
      const now = new Date();
      const rows = await this.db
        .select()
        .from(events)
        .where(
          and(
            eq(events.isActive, true),
            gt(events.endsAt, now),
            between(events.latitude, String(lat - delta), String(lat + delta)),
            between(events.longitude, String(lng - delta), String(lng + delta)),
          ),
        )
        .orderBy(events.startsAt)
        .limit(limit);

      return rows.map(this.toEventRecord);
    } catch {
      return [];
    }
  }

  async getById(id: string): Promise<EventRecord | null> {
    try {
      const rows = await this.db
        .select()
        .from(events)
        .where(eq(events.id, id))
        .limit(1);

      if (rows.length === 0 || !rows[0]) return null;
      return this.toEventRecord(rows[0]);
    } catch {
      return null;
    }
  }

  private toEventRecord(row: typeof events.$inferSelect): EventRecord {
    return {
      id: row.id,
      nameKo: row.nameKo,
      names: (row.names ?? {}) as LocalizedText,
      description: (row.description ?? {}) as LocalizedText,
      category: row.category,
      venueName: (row.venueName ?? {}) as LocalizedText,
      addressKo: row.addressKo,
      latitude: row.latitude ? Number(row.latitude) : null,
      longitude: row.longitude ? Number(row.longitude) : null,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      priceInfo: (row.priceInfo ?? {}) as LocalizedText,
      bookingUrl: row.bookingUrl,
      images: (row.images ?? []) as string[],
      source: row.source,
      isActive: row.isActive,
    };
  }
}
