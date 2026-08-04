import { describe, it, expect, vi } from "vitest";
import { TransitService } from "./transit.service";
import type { TransitProvider, TransitRoute } from "@/lib/external/transit/types";
import type { LocationResolver } from "@/services/ai/location-resolver";
import { TaxiService } from "./taxi.service";

const MOCK_ROUTE: TransitRoute = {
  summary: "Bus 1003 → Walk",
  duration: 55,
  distance: 18200,
  fare: 2650,
  steps: [
    {
      mode: "bus",
      instruction: { en: "Take Bus 1003", ko: "1003번 버스 탑승" },
      duration: 35,
      distance: 14000,
      line: "1003",
      stops: 18,
    },
    {
      mode: "walk",
      instruction: { en: "Walk 15 min", ko: "도보 15분" },
      duration: 15,
      distance: 900,
    },
  ],
  departureTime: new Date(),
  arrivalTime: new Date(Date.now() + 55 * 60 * 1000),
};

function createMockProvider(routes: TransitRoute[] = [MOCK_ROUTE]): TransitProvider {
  return {
    searchRoutes: vi.fn().mockResolvedValue(routes),
  };
}

function createMockLocationResolver(
  result: { spotId: string; spotName: string; confidence: number; source: "alias" } | null = {
    spotId: "spot-1",
    spotName: "해운대해수욕장",
    confidence: 1.0,
    source: "alias",
  },
): LocationResolver {
  return {
    resolve: vi.fn().mockResolvedValue(result),
  } as unknown as LocationResolver;
}

function createMockSpotRepo(): { getById: ReturnType<typeof vi.fn> } {
  return {
    getById: vi.fn().mockResolvedValue({
      id: "spot-1",
      latitude: 35.1586,
      longitude: 129.1604,
    }),
  };
}

describe("TransitService", () => {
  it("returns formatted route messages when routes are found", async () => {
    const provider = createMockProvider();
    const resolver = createMockLocationResolver();
    const spotRepo = createMockSpotRepo();
    const taxi = new TaxiService();

    const service = new TransitService([provider], resolver, taxi, spotRepo as never);
    const messages = await service.searchRoute("Haeundae", "Gamcheon", "en");

    expect(messages.length).toBeGreaterThan(0);
    expect(messages[0]!.type).toBe("text");
    expect(messages[0]!.text).toContain("Bus 1003");
  });

  it("falls back to taxi links when no routes found", async () => {
    const provider = createMockProvider([]);
    const resolver = createMockLocationResolver();
    const spotRepo = createMockSpotRepo();
    const taxi = new TaxiService();

    const service = new TransitService([provider], resolver, taxi, spotRepo as never);
    const messages = await service.searchRoute("A", "B", "en");

    const hasTaxi = messages.some((m) => m.type === "buttons");
    expect(hasTaxi).toBe(true);
  });

  it("returns error message when location cannot be resolved", async () => {
    const provider = createMockProvider();
    const resolver = createMockLocationResolver(null);
    const spotRepo = createMockSpotRepo();
    const taxi = new TaxiService();

    const service = new TransitService([provider], resolver, taxi, spotRepo as never);
    const messages = await service.searchRoute("unknown", "place", "en");

    expect(messages.length).toBe(1);
    expect(messages[0]!.type).toBe("text");
  });

  it("tries next provider when first fails", async () => {
    const failProvider: TransitProvider = {
      searchRoutes: vi.fn().mockResolvedValue([]),
    };
    const successProvider = createMockProvider();
    const resolver = createMockLocationResolver();
    const spotRepo = createMockSpotRepo();
    const taxi = new TaxiService();

    const service = new TransitService(
      [failProvider, successProvider],
      resolver,
      taxi,
      spotRepo as never,
    );
    const messages = await service.searchRoute("A", "B", "en");

    expect(messages[0]!.text).toContain("Bus 1003");
  });
});
