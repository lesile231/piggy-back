import { describe, it, expect, vi } from "vitest";
import { IntentClassifier } from "./intent-classifier";
import type { LLMRouter } from "./llm-router";
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

describe("IntentClassifier", () => {
  it("classifies tourism intent", async () => {
    const router = createMockRouter(JSON.stringify({
      intent: "tourism",
      confidence: 0.95,
      entities: { location: "Haeundae" },
    }));
    const classifier = new IntentClassifier(router);

    const result = await classifier.classify("Best restaurant near Haeundae?", "en");
    expect(result.intent).toBe("tourism");
    expect(result.extractedEntities?.location).toBe("Haeundae");
  });

  it("classifies off_topic intent", async () => {
    const router = createMockRouter(JSON.stringify({
      intent: "off_topic",
      confidence: 0.9,
      entities: {},
    }));
    const classifier = new IntentClassifier(router);

    const result = await classifier.classify("What is the meaning of life?", "en");
    expect(result.intent).toBe("off_topic");
  });

  it("defaults to off_topic on malformed JSON", async () => {
    const router = createMockRouter("not json");
    const classifier = new IntentClassifier(router);

    const result = await classifier.classify("test", "en");
    expect(result.intent).toBe("off_topic");
    expect(result.confidence).toBe(0);
  });
});
