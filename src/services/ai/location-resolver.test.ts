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

function createMockDb(aliasResult: unknown[] = [], spotResults: unknown[] = []): Database {
  // For alias search: select().from().innerJoin().where().limit() -> aliasResult
  // For candidate spots: select().from().where().limit() -> spotResults

  const aliasChain = {
    limit: vi.fn().mockResolvedValue(aliasResult),
  };

  const spotChain = {
    limit: vi.fn().mockResolvedValue(spotResults),
  };

  const whereForAlias = {
    innerJoin: vi.fn().mockReturnValue(aliasChain),
    limit: vi.fn().mockResolvedValue(aliasResult),
  };

  const whereForSpots = {
    limit: vi.fn().mockResolvedValue(spotResults),
  };

  const selectMock = vi.fn();

  // First call: alias search
  selectMock.mockReturnValueOnce({
    from: vi.fn().mockReturnValue({
      innerJoin: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue(whereForAlias),
      }),
    }),
  });

  // Second call (if alias not found): candidate spots search
  selectMock.mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue(whereForSpots),
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

function createMockSpotRepo(similarResults: unknown[] = []): SpotRepository {
  return {
    searchBySimilarity: vi.fn().mockResolvedValue(similarResults),
    searchByName: vi.fn().mockResolvedValue([]),
    searchByCategory: vi.fn().mockResolvedValue([]),
    getById: vi.fn().mockResolvedValue(null),
    upsertFromExternal: vi.fn(),
  } as unknown as SpotRepository;
}

describe("LocationResolver", () => {
  it("Stage 1: returns result from alias DB match", async () => {
    const mockDb = createMockDb([
      { spotId: "spot-1", spotName: "자갈치시장", alias: "fish market" },
    ]);
    const router = createMockRouter("{}");
    const resolver = new LocationResolver(mockDb, router);

    const result = await resolver.resolve("fish market", "en");
    expect(result).not.toBeNull();
    expect(result!.source).toBe("alias");
    expect(result!.spotId).toBe("spot-1");
    // LLM should NOT have been called
    expect(router.lightweightJson).not.toHaveBeenCalled();
  });

  it("Stage 3: falls back to LLM when alias not found", async () => {
    const mockDb = createMockDb([], [
      { id: "spot-1", nameKo: "자갈치시장", names: { en: "Jagalchi Fish Market" } },
      { id: "spot-2", nameKo: "부산공동어시장", names: { en: "Busan Cooperative Fish Market" } },
    ]);
    const router = createMockRouter(JSON.stringify({
      matchIndex: 1,
      confidence: 0.9,
      reasoning: "Jagalchi is the famous fish market",
    }));
    const resolver = new LocationResolver(mockDb, router);

    const result = await resolver.resolve("the big fish market", "en");
    expect(result).not.toBeNull();
    expect(result!.source).toBe("gpt");
    expect(result!.spotId).toBe("spot-1");
  });

  it("returns null when LLM cannot resolve", async () => {
    const mockDb = createMockDb([], []);
    const router = createMockRouter(JSON.stringify({
      matchIndex: null,
      confidence: 0.1,
    }));
    const resolver = new LocationResolver(mockDb, router);

    const result = await resolver.resolve("xyznonexistent", "en");
    expect(result).toBeNull();
  });

  it("Stage 2: returns result from embedding similarity search", async () => {
    const mockDb = createMockDb([]); // No alias match
    const router = createMockRouter("{}");
    const embeddingProvider = createMockEmbeddingProvider();
    const spotRepo = createMockSpotRepo([
      {
        id: "spot-1",
        nameKo: "해운대해수욕장",
        names: { en: "Haeundae Beach" },
        similarity: 0.92,
        description: {}, addressKo: null, addresses: {},
        latitude: 35.1586, longitude: 129.1604,
        phone: null, website: null, images: [], rating: null,
        source: "manual", isActive: true,
      },
    ]);

    const resolver = new LocationResolver(mockDb, router, embeddingProvider, spotRepo);
    const result = await resolver.resolve("haeundae beach", "en");

    expect(result).not.toBeNull();
    expect(result!.source).toBe("embedding");
    expect(result!.spotId).toBe("spot-1");
    expect(result!.confidence).toBe(0.92);
    // LLM should NOT have been called
    expect(router.lightweightJson).not.toHaveBeenCalled();
  });

  it("Stage 2: skips to Stage 3 when embedding has no results", async () => {
    const mockDb = createMockDb([], [
      { id: "spot-1", nameKo: "자갈치시장", names: { en: "Jagalchi Market" } },
    ]);
    const router = createMockRouter(JSON.stringify({
      matchIndex: 1, confidence: 0.9, reasoning: "match",
    }));
    const embeddingProvider = createMockEmbeddingProvider();
    const spotRepo = createMockSpotRepo([]); // No embedding match

    const resolver = new LocationResolver(mockDb, router, embeddingProvider, spotRepo);
    const result = await resolver.resolve("fish market", "en");

    expect(result).not.toBeNull();
    expect(result!.source).toBe("gpt"); // Fell through to Stage 3
  });
});
