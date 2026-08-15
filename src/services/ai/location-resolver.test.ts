import { describe, it, expect, vi } from "vitest";
import { LocationResolver } from "./location-resolver";
import type { LLMRouter } from "./llm-router";
import type { Database } from "@/lib/db/client";
import type { LLMResponse } from "@/types/ai";
import type { EmbeddingProvider } from "@/lib/external/embedding/types";
import type { SpotRepository } from "@/services/tourism/spot.repository";

function createMockRouter(responseContent: string): LLMRouter {
  return {
    lightweightJson: vi.fn().mockResolvedValue({
      content: responseContent,
      tokensUsed: { input: 10, output: 20 },
      model: "test",
      provider: "test",
    } satisfies LLMResponse),
  } as unknown as LLMRouter;
}

function createMockDb(
  aliasResult: unknown[] = [],
  spotResults: unknown[] = [],
): Database {
  const selectMock = vi.fn();

  // First call: alias search — select().from().innerJoin().where().limit()
  selectMock.mockReturnValueOnce({
    from: vi.fn().mockReturnValue({
      innerJoin: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue(aliasResult),
        }),
      }),
    }),
  });

  // Second call (if alias not found): candidate spots — select().from().where().limit()
  selectMock.mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(spotResults),
      }),
    }),
  });

  return {
    select: selectMock,
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
      }),
    }),
  } as unknown as Database;
}

function createMockEmbeddingProvider(): EmbeddingProvider {
  return {
    embed: vi.fn().mockResolvedValue([[0.1, 0.2, 0.3]]),
    dimensions: 3,
  };
}

function createMockSpotRepo(
  similarResults: unknown[] = [],
): SpotRepository {
  return {
    searchBySimilarity: vi.fn().mockResolvedValue(similarResults),
    searchByName: vi.fn().mockResolvedValue([]),
    searchByCategory: vi.fn().mockResolvedValue([]),
    getById: vi.fn().mockResolvedValue(null),
    upsertFromExternal: vi.fn(),
  } as unknown as SpotRepository;
}

describe("LocationResolver", () => {
  it("Stage 2: resolves via alias — action = navigate (single, confidence 1.0)", async () => {
    const mockDb = createMockDb([
      {
        spotId: "spot-1",
        nameKo: "자갈치시장",
        names: { en: "Jagalchi Fish Market" },
      },
    ]);
    const router = createMockRouter("{}");
    const resolver = new LocationResolver(mockDb, router);

    const result = await resolver.resolve("fish market", "en");
    expect(result.stage).toBe(2);
    expect(result.action).toBe("navigate");
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].placeId).toBe("spot-1");
    expect(result.matches[0].nameKo).toBe("자갈치시장");
    expect(result.matches[0].confidence).toBe(1.0);
    expect(router.lightweightJson).not.toHaveBeenCalled();
  });

  it("Stage 2: multiple alias matches → action = confirm", async () => {
    const mockDb = createMockDb([
      {
        spotId: "spot-1",
        nameKo: "자갈치시장",
        names: { en: "Jagalchi Fish Market" },
      },
      {
        spotId: "spot-2",
        nameKo: "부산공동어시장",
        names: { en: "Busan Cooperative Fish Market" },
      },
    ]);
    const router = createMockRouter("{}");
    const resolver = new LocationResolver(mockDb, router);

    const result = await resolver.resolve("fish market", "en");
    expect(result.stage).toBe(2);
    expect(result.action).toBe("confirm");
    expect(result.matches).toHaveLength(2);
  });

  it("Stage 5: LLM single high-confidence → action = navigate", async () => {
    const mockDb = createMockDb([], [
      {
        id: "spot-1",
        nameKo: "자갈치시장",
        names: { en: "Jagalchi Fish Market" },
      },
    ]);
    const router = createMockRouter(
      JSON.stringify({
        matches: [{ matchIndex: 1, confidence: 0.95 }],
        reasoning: "Jagalchi is the famous fish market",
      }),
    );
    const resolver = new LocationResolver(mockDb, router);

    const result = await resolver.resolve("the big fish market", "en");
    expect(result.stage).toBe(5);
    expect(result.action).toBe("navigate");
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].placeId).toBe("spot-1");
  });

  it("Stage 5: LLM moderate confidence → action = confirm", async () => {
    const mockDb = createMockDb([], [
      {
        id: "spot-1",
        nameKo: "자갈치시장",
        names: { en: "Jagalchi Fish Market" },
      },
    ]);
    const router = createMockRouter(
      JSON.stringify({
        matches: [{ matchIndex: 1, confidence: 0.75 }],
        reasoning: "likely match",
      }),
    );
    const resolver = new LocationResolver(mockDb, router);

    const result = await resolver.resolve("that market near the port", "en");
    expect(result.stage).toBe(5);
    expect(result.action).toBe("confirm");
  });

  it("Stage 5: LLM low confidence → action = disambiguate", async () => {
    const mockDb = createMockDb([], [
      {
        id: "spot-1",
        nameKo: "자갈치시장",
        names: { en: "Jagalchi Market" },
      },
      {
        id: "spot-2",
        nameKo: "국제시장",
        names: { en: "Gukje Market" },
      },
    ]);
    const router = createMockRouter(
      JSON.stringify({
        matches: [
          { matchIndex: 1, confidence: 0.55 },
          { matchIndex: 2, confidence: 0.52 },
        ],
        reasoning: "ambiguous query",
      }),
    );
    const resolver = new LocationResolver(mockDb, router);

    const result = await resolver.resolve("some market", "en");
    expect(result.stage).toBe(5);
    expect(result.action).toBe("disambiguate");
    expect(result.matches).toHaveLength(2);
  });

  it("returns empty matches + action = empty when LLM cannot resolve", async () => {
    const mockDb = createMockDb([], []);
    const router = createMockRouter(
      JSON.stringify({
        matches: [],
        reasoning: "no match found",
      }),
    );
    const resolver = new LocationResolver(mockDb, router);

    const result = await resolver.resolve("xyznonexistent", "en");
    expect(result.stage).toBeNull();
    expect(result.action).toBe("empty");
    expect(result.matches).toHaveLength(0);
  });

  it("Stage 5: resolves via embedding similarity", async () => {
    const mockDb = createMockDb([]);
    const router = createMockRouter("{}");
    const embeddingProvider = createMockEmbeddingProvider();
    const spotRepo = createMockSpotRepo([
      {
        id: "spot-1",
        nameKo: "해운대해수욕장",
        names: { en: "Haeundae Beach" },
        similarity: 0.92,
        description: {},
        addressKo: null,
        addresses: {},
        latitude: 35.1586,
        longitude: 129.1604,
        phone: null,
        website: null,
        images: [],
        rating: null,
        source: "manual",
        isActive: true,
      },
    ]);

    const resolver = new LocationResolver(
      mockDb,
      router,
      embeddingProvider,
      spotRepo,
    );
    const result = await resolver.resolve("haeundae beach", "en");

    expect(result.stage).toBe(5);
    expect(result.action).toBe("navigate");
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].placeId).toBe("spot-1");
    expect(result.matches[0].confidence).toBe(0.92);
    expect(router.lightweightJson).not.toHaveBeenCalled();
  });

  it("Stage 5: falls through embedding to LLM when no embedding match", async () => {
    const mockDb = createMockDb([], [
      {
        id: "spot-1",
        nameKo: "자갈치시장",
        names: { en: "Jagalchi Market" },
      },
    ]);
    const router = createMockRouter(
      JSON.stringify({
        matches: [{ matchIndex: 1, confidence: 0.9 }],
        reasoning: "match",
      }),
    );
    const embeddingProvider = createMockEmbeddingProvider();
    const spotRepo = createMockSpotRepo([]); // No embedding match

    const resolver = new LocationResolver(
      mockDb,
      router,
      embeddingProvider,
      spotRepo,
    );
    const result = await resolver.resolve("fish market", "en");

    expect(result.stage).toBe(5);
    expect(result.matches[0].placeId).toBe("spot-1");
  });

  it("resolveLegacy returns backward-compatible ResolvedLocation", async () => {
    const mockDb = createMockDb([
      {
        spotId: "spot-1",
        nameKo: "자갈치시장",
        names: { en: "Jagalchi Fish Market" },
      },
    ]);
    const router = createMockRouter("{}");
    const resolver = new LocationResolver(mockDb, router);

    const result = await resolver.resolveLegacy("fish market", "en");
    expect(result).not.toBeNull();
    expect(result!.spotId).toBe("spot-1");
    expect(result!.spotName).toBe("자갈치시장");
    expect(result!.source).toBe("alias");
    expect(result!.confidence).toBe(1.0);
  });

  it("normalizes query before alias lookup", async () => {
    const mockDb = createMockDb([
      {
        spotId: "spot-1",
        nameKo: "해운대해수욕장",
        names: { en: "Haeundae Beach" },
      },
    ]);
    const router = createMockRouter("{}");
    const resolver = new LocationResolver(mockDb, router);

    const result = await resolver.resolve("Hae-un-dae", "en");
    expect(result.normalizedQuery).toBe("haeundae");
    expect(result.query).toBe("Hae-un-dae");
  });
});
