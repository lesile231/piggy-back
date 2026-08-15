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
  it("returns LLM response for action intent without IntentRouter", async () => {
    const router = createMockRouter("Haeundae Beach is the best spot!");
    const classifier = createMockClassifier("resolve_place", 0.95);
    const service = new ChatService(router, classifier);

    const result = await service.generateResponse("Best beach?", "en");
    // Without IntentRouter, falls back to LLM conversation
    expect(result.messages[0]?.text).toBe("Haeundae Beach is the best spot!");
    expect(result.tokensUsed).toBe(150);
    expect(router.conversation).toHaveBeenCalled();
  });

  it("returns polite rejection for off_topic intent", async () => {
    const router = createMockRouter("should not be called");
    const classifier = createMockClassifier("off_topic", 0.9);
    const service = new ChatService(router, classifier);

    const result = await service.generateResponse("What is the meaning of life?", "en");
    expect(result.messages[0]?.text).toContain("Busan");
    expect(result.tokensUsed).toBe(0);
    expect(router.conversation).not.toHaveBeenCalled();
  });

  it("returns greeting for greeting intent", async () => {
    const router = createMockRouter("should not be called");
    const classifier = createMockClassifier("greeting", 0.95);
    const service = new ChatService(router, classifier);

    const result = await service.generateResponse("Hello!", "ja");
    expect(result.messages[0]?.text?.length).toBeGreaterThan(0);
    expect(result.tokensUsed).toBe(0);
  });

  it("routes to IntentRouter when available", async () => {
    const router = createMockRouter("should not be called");
    const classifier = createMockClassifier("whats_on", 0.9);
    const service = new ChatService(router, classifier);

    const mockIntentRouter = {
      route: vi.fn().mockResolvedValue([
        { type: "text", text: "Events happening now..." },
      ]),
    };
    service.setIntentRouter(mockIntentRouter as never);

    const result = await service.generateResponse("What's happening?", "en");
    expect(result.messages[0]?.text).toBe("Events happening now...");
    expect(mockIntentRouter.route).toHaveBeenCalled();
    expect(router.conversation).not.toHaveBeenCalled();
  });

  it("returns fallback buttons for fallback intent", async () => {
    const router = createMockRouter("should not be called");
    const classifier = createMockClassifier("fallback", 0.3);
    const service = new ChatService(router, classifier);

    const mockIntentRouter = {
      route: vi.fn().mockResolvedValue([
        { type: "buttons", text: "What can I help with?", buttons: [
          { id: "intent:resolve_place", label: "Find a place" },
        ]},
      ]),
    };
    service.setIntentRouter(mockIntentRouter as never);

    const result = await service.generateResponse("hmm", "en");
    expect(result.messages[0]?.type).toBe("buttons");
  });
});
