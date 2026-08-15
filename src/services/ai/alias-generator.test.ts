import { describe, it, expect, vi, beforeEach } from "vitest";
import { AliasGenerator } from "./alias-generator";
import type { LLMRouter } from "./llm-router";
import type { LLMResponse } from "@/types/ai";

function createMockRouter(response: string, shouldFail = false) {
  return {
    lightweightJson: vi.fn().mockImplementation(async () => {
      if (shouldFail) throw new Error("LLM unavailable");
      return {
        content: response,
        tokensUsed: { input: 100, output: 200 },
        model: "test-model",
        provider: "test",
      } satisfies LLMResponse;
    }),
  } as unknown as LLMRouter;
}

function createMockDb(shouldFail = false) {
  const onConflictDoNothing = vi.fn().mockImplementation(async () => {
    if (shouldFail) throw new Error("DB error");
    return { rowCount: 1 };
  });
  const values = vi.fn().mockReturnValue({ onConflictDoNothing });
  const insert = vi.fn().mockReturnValue({ values });
  return { insert, values, onConflictDoNothing } as const;
}

const VALID_RESPONSE = JSON.stringify({
  aliases: [
    { alias: "Haeundae Beach", language: "en" },
    { alias: "haeundae", language: "en" },
    { alias: "海雲台ビーチ", language: "ja" },
    { alias: "海云台海水浴场", language: "zh" },
    { alias: "Playa Haeundae", language: "es" },
    { alias: "해운대", language: "ko" },
  ],
});

describe("AliasGenerator", () => {
  const spot = {
    id: "spot-123",
    nameKo: "해운대 해수욕장",
    names: { en: "Haeundae Beach", ja: "海雲台ビーチ" },
    addressKo: "부산광역시 해운대구",
  };

  it("generates and saves aliases from LLM response", async () => {
    const router = createMockRouter(VALID_RESPONSE);
    const mock = createMockDb();
    const db = { insert: mock.insert } as any;

    const generator = new AliasGenerator(db, router);
    const count = await generator.generateAndSave(spot);

    expect(count).toBe(6);
    expect(router.lightweightJson).toHaveBeenCalledOnce();
    expect(mock.insert).toHaveBeenCalledOnce();
    expect(mock.values).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ alias: "Haeundae Beach", language: "en", source: "ai_generated", spotId: "spot-123" }),
      ]),
    );
  });

  it("returns 0 when LLM fails", async () => {
    const router = createMockRouter("", true);
    const mock = createMockDb();
    const db = { insert: mock.insert } as any;

    const generator = new AliasGenerator(db, router);
    const count = await generator.generateAndSave(spot);

    expect(count).toBe(0);
    expect(mock.insert).not.toHaveBeenCalled();
  });

  it("returns 0 when LLM returns invalid JSON", async () => {
    const router = createMockRouter("not valid json");
    const mock = createMockDb();
    const db = { insert: mock.insert } as any;

    const generator = new AliasGenerator(db, router);
    const count = await generator.generateAndSave(spot);

    expect(count).toBe(0);
    expect(mock.insert).not.toHaveBeenCalled();
  });

  it("returns 0 when LLM returns JSON without aliases array", async () => {
    const router = createMockRouter(JSON.stringify({ data: [] }));
    const mock = createMockDb();
    const db = { insert: mock.insert } as any;

    const generator = new AliasGenerator(db, router);
    const count = await generator.generateAndSave(spot);

    expect(count).toBe(0);
    expect(mock.insert).not.toHaveBeenCalled();
  });

  it("filters out invalid alias entries", async () => {
    const response = JSON.stringify({
      aliases: [
        { alias: "Haeundae Beach", language: "en" },
        { alias: "", language: "en" },
        { alias: 123, language: "en" },
        { language: "en" },
        { alias: "valid", language: "ko" },
      ],
    });
    const router = createMockRouter(response);
    const mock = createMockDb();
    const db = { insert: mock.insert } as any;

    const generator = new AliasGenerator(db, router);
    const count = await generator.generateAndSave(spot);

    expect(count).toBe(2);
    expect(mock.values).toHaveBeenCalledWith([
      expect.objectContaining({ alias: "Haeundae Beach" }),
      expect.objectContaining({ alias: "valid" }),
    ]);
  });

  it("returns 0 when DB insert fails", async () => {
    const router = createMockRouter(VALID_RESPONSE);
    const mock = createMockDb(true);
    const db = { insert: mock.insert } as any;

    const generator = new AliasGenerator(db, router);
    const count = await generator.generateAndSave(spot);

    expect(count).toBe(0);
  });

  it("handles spot without addressKo", async () => {
    const router = createMockRouter(VALID_RESPONSE);
    const mock = createMockDb();
    const db = { insert: mock.insert } as any;

    const generator = new AliasGenerator(db, router);
    const count = await generator.generateAndSave({
      id: "spot-456",
      nameKo: "감천문화마을",
      names: { en: "Gamcheon Culture Village" },
      addressKo: null,
    });

    expect(count).toBe(6);
    expect(router.lightweightJson).toHaveBeenCalledOnce();
  });
});
