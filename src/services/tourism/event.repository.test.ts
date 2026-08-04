import { describe, it, expect, vi } from "vitest";
import { EventRepository } from "./event.repository";
import type { Database } from "@/lib/db/client";

function createMockDb(results: unknown[] = []): Database {
  const chain = {
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(results),
    orderBy: vi.fn().mockReturnThis(),
  };

  return {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue(chain),
    }),
  } as unknown as Database;
}

describe("EventRepository", () => {
  it("getActiveEvents returns events from DB", async () => {
    const mockEvent = {
      id: "event-1",
      nameKo: "부산국제영화제",
      names: { en: "Busan International Film Festival" },
      description: { en: "Annual film festival" },
      category: "festival",
      venueName: { en: "Busan Cinema Center" },
      addressKo: "부산시 해운대구",
      addresses: {},
      latitude: "35.1586",
      longitude: "129.1604",
      startsAt: new Date("2026-10-01"),
      endsAt: new Date("2026-10-10"),
      priceInfo: { en: "Free" },
      bookingUrl: "https://biff.kr",
      images: [],
      source: "manual",
      isActive: true,
    };
    const db = createMockDb([mockEvent]);
    const repo = new EventRepository(db);

    const results = await repo.getActiveEvents();
    expect(results.length).toBe(1);
    expect(results[0]!.nameKo).toBe("부산국제영화제");
  });

  it("getById returns null for missing event", async () => {
    const db = createMockDb([]);
    const repo = new EventRepository(db);

    const result = await repo.getById("nonexistent");
    expect(result).toBeNull();
  });
});
