import { describe, it, expect, vi } from "vitest";
import { ChatService } from "./chat.service";
import type { LLMRouter } from "./llm-router";
import type { IntentClassifier } from "./intent-classifier";
import type { LLMResponse } from "@/types/ai";

function createMockRouter(content: string): LLMRouter {
  return {
    conversation: vi.fn().mockResolvedValue({
      content,
      tokensUsed: { input: 50, output: 100 },
      model: "test-model",
      provider: "test",
    } satisfies LLMResponse),
  } as unknown as LLMRouter;
}

function createMockClassifier(intent: string, confidence: number): IntentClassifier {
  return {
    classify: vi.fn().mockResolvedValue({ intent, confidence, extractedEntities: {} }),
  } as unknown as IntentClassifier;
}

describe("ChatService", () => {
  it("returns LLM response for allowed intent", async () => {
    const router = createMockRouter("Haeundae Beach is the best spot!");
    const classifier = createMockClassifier("tourism", 0.95);
    const service = new ChatService(router, classifier);

    const result = await service.generateResponse("Best beach?", "en");
    expect(result.response).toBe("Haeundae Beach is the best spot!");
    expect(result.tokensUsed).toBe(150);
    expect(router.conversation).toHaveBeenCalled();
  });

  it("returns polite rejection for off_topic intent", async () => {
    const router = createMockRouter("should not be called");
    const classifier = createMockClassifier("off_topic", 0.9);
    const service = new ChatService(router, classifier);

    const result = await service.generateResponse("What is the meaning of life?", "en");
    expect(result.response).toContain("Busan");
    expect(result.tokensUsed).toBe(0);
    expect(router.conversation).not.toHaveBeenCalled();
  });

  it("returns polite rejection for greeting intent", async () => {
    const router = createMockRouter("should not be called");
    const classifier = createMockClassifier("greeting", 0.95);
    const service = new ChatService(router, classifier);

    const result = await service.generateResponse("Hello!", "ja");
    expect(result.response.length).toBeGreaterThan(0);
    expect(result.tokensUsed).toBe(0);
  });
});
