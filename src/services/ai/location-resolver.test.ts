import { describe, it, expect, vi } from "vitest";
import { LocationResolver } from "./location-resolver";
import type { LLMRouter } from "./llm-router";
import type { Database } from "@/lib/db/client";
import type { LLMResponse } from "@/types/ai";

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
});
