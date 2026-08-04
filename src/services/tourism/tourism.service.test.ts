import { describe, it, expect, vi } from "vitest";
import { TourismService } from "./tourism.service";
import type { SpotRepository } from "./spot.repository";
import type { TourismProvider } from "@/lib/external/tourism/types";
import type { LocationResolver } from "@/services/ai/location-resolver";
import type { SpotRecord } from "./types";

const MOCK_SPOT: SpotRecord = {
  id: "spot-1",
  nameKo: "해운대해수욕장",
  names: { en: "Haeundae Beach", ko: "해운대해수욕장" },
  description: { en: "Famous beach in Busan", ko: "부산에서 가장 유명한 해수욕장" },
  addressKo: "부산 해운대구",
  addresses: { en: "Haeundae-gu, Busan" },
  latitude: 35.1586,
  longitude: 129.1604,
  phone: null,
  website: null,
  images: [],
  rating: 4.5,
  source: "manual",
  isActive: true,
};

function createMockSpotRepo(results: SpotRecord[] = [MOCK_SPOT]): SpotRepository {
  return {
    searchByName: vi.fn().mockResolvedValue(results),
    searchByCategory: vi.fn().mockResolvedValue(results),
    getById: vi.fn().mockResolvedValue(results[0] ?? null),
    searchBySimilarity: vi.fn().mockResolvedValue([]),
    upsertFromExternal: vi.fn().mockResolvedValue(MOCK_SPOT),
  } as unknown as SpotRepository;
}

function createMockTourismProvider(): TourismProvider {
  return {
    searchSpots: vi.fn().mockResolvedValue([]),
    getSpotDetail: vi.fn().mockResolvedValue(null),
  };
}

function createMockLocationResolver(): LocationResolver {
  return {
    resolve: vi.fn().mockResolvedValue(null),
  } as unknown as LocationResolver;
}

describe("TourismService", () => {
  it("returns formatted spot results from DB", async () => {
    const repo = createMockSpotRepo();
    const provider = createMockTourismProvider();
    const resolver = createMockLocationResolver();
    const service = new TourismService(repo, [provider], resolver);

    const messages = await service.searchSpots("beach", "en");

    expect(messages.length).toBeGreaterThan(0);
    expect(messages[0]!.type).toBe("buttons");
    expect(messages[0]!.buttons?.[0]?.label).toContain("Haeundae Beach");
  });

  it("falls back to provider when DB has insufficient results", async () => {
    const repo = createMockSpotRepo([]);
    const provider: TourismProvider = {
      searchSpots: vi.fn().mockResolvedValue([{
        externalId: "ext-1",
        names: { en: "External Beach" },
        description: { en: "A beach" },
        address: { en: "Busan" },
        latitude: 35.0,
        longitude: 129.0,
        category: "beach",
        images: [],
      }]),
      getSpotDetail: vi.fn().mockResolvedValue(null),
    };
    const resolver = createMockLocationResolver();
    const service = new TourismService(repo, [provider], resolver);

    const messages = await service.searchSpots("beach", "en");

    expect(provider.searchSpots).toHaveBeenCalled();
  });

  it("getSpotDetail returns detailed info", async () => {
    const repo = createMockSpotRepo();
    const provider = createMockTourismProvider();
    const resolver = createMockLocationResolver();
    const service = new TourismService(repo, [provider], resolver);

    const messages = await service.getSpotDetail("spot-1", "en");

    expect(messages.length).toBeGreaterThan(0);
    expect(messages[0]!.text).toContain("Haeundae Beach");
  });

  it("returns 'no results' message when nothing found", async () => {
    const repo = createMockSpotRepo([]);
    const provider = createMockTourismProvider();
    const resolver = createMockLocationResolver();
    const service = new TourismService(repo, [provider], resolver);

    const messages = await service.searchSpots("zzzznonexistent", "en");

    expect(messages.length).toBe(1);
    expect(messages[0]!.type).toBe("text");
  });
});
