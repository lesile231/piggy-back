import { describe, it, expect, vi } from "vitest";
import { SpotRepository } from "./spot.repository";
import type { Database } from "@/lib/db/client";

function createMockDb(results: unknown[] = []): Database {
  const chain = {
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(results),
    orderBy: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
  };

  return {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue(chain),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockResolvedValue([{ id: "spot-1" }]),
        onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
        returning: vi.fn().mockResolvedValue([{
          id: "spot-1", nameKo: "해운대해수욕장",
          names: { en: "Haeundae Beach" }, description: {},
          addressKo: null, addresses: {},
          latitude: 35.1586, longitude: 129.1604,
          phone: null, website: null,
          images: [], rating: null,
          source: "tour_api", isActive: true,
        }]),
      }),
    }),
    execute: vi.fn().mockResolvedValue([]),
  } as unknown as Database;
}

describe("SpotRepository", () => {
  it("searchByName queries DB with ilike pattern", async () => {
    const mockSpot = {
      id: "spot-1", nameKo: "해운대해수욕장",
      names: { en: "Haeundae Beach" }, description: {},
      addressKo: null, addresses: {},
      latitude: "35.1586", longitude: "129.1604",
      phone: null, website: null,
      images: [], rating: null,
      source: "manual", isActive: true,
    };
    const db = createMockDb([mockSpot]);
    const repo = new SpotRepository(db);

    const results = await repo.searchByName("haeundae");
    expect(results.length).toBe(1);
    expect(results[0]!.nameKo).toBe("해운대해수욕장");
  });

  it("getById returns a spot or null", async () => {
    const db = createMockDb([]);
    const repo = new SpotRepository(db);

    const result = await repo.getById("nonexistent");
    expect(result).toBeNull();
  });

  it("upsertFromExternal creates a spot record", async () => {
    const db = createMockDb();
    const repo = new SpotRepository(db);

    const external = {
      externalId: "ext-1",
      names: { en: "Test Spot" },
      description: { en: "A test" },
      address: { en: "123 Street" },
      latitude: 35.0,
      longitude: 129.0,
      category: "landmark",
      images: [],
    };

    const result = await repo.upsertFromExternal(external, "tour_api");
    expect(result).not.toBeNull();
    expect(result.id).toBe("spot-1");
  });
});
