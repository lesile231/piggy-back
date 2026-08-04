import { describe, it, expect, vi } from "vitest";
import { LLMRouter } from "./llm-router";
import type { LLMProvider } from "./llm-provider";
import type { LLMResponse } from "@/types/ai";

function createMockProvider(name: string, shouldFail = false): LLMProvider {
  return {
    chat: vi.fn().mockImplementation(async () => {
      if (shouldFail) throw new Error(`${name} failed`);
      return {
        content: `response from ${name}`,
        tokensUsed: { input: 10, output: 20 },
        model: "test-model",
        provider: name,
      } satisfies LLMResponse;
    }),
  };
}

describe("LLMRouter", () => {
  it("lightweight uses primary provider", async () => {
    const primary = createMockProvider("groq");
    const fallback = createMockProvider("together");
    const router = new LLMRouter(primary, fallback, {
      lightModel: "llama-3.1-8b-instant",
      chatModel: "llama-3.3-70b-versatile",
    });

    const result = await router.lightweight([{ role: "user", content: "test" }]);
    expect(result.provider).toBe("groq");
    expect(primary.chat).toHaveBeenCalledOnce();
    expect(fallback.chat).not.toHaveBeenCalled();
  });

  it("conversation uses primary provider", async () => {
    const primary = createMockProvider("groq");
    const fallback = createMockProvider("together");
    const router = new LLMRouter(primary, fallback, {
      lightModel: "llama-3.1-8b-instant",
      chatModel: "llama-3.3-70b-versatile",
    });

    const result = await router.conversation([{ role: "user", content: "hello" }]);
    expect(result.provider).toBe("groq");
  });

  it("falls back when primary fails", async () => {
    const primary = createMockProvider("groq", true);
    const fallback = createMockProvider("together");
    const router = new LLMRouter(primary, fallback, {
      lightModel: "llama-3.1-8b-instant",
      chatModel: "llama-3.3-70b-versatile",
    });

    const result = await router.lightweight([{ role: "user", content: "test" }]);
    expect(result.provider).toBe("together");
  });

  it("throws when both providers fail", async () => {
    const primary = createMockProvider("groq", true);
    const fallback = createMockProvider("together", true);
    const router = new LLMRouter(primary, fallback, {
      lightModel: "llama-3.1-8b-instant",
      chatModel: "llama-3.3-70b-versatile",
    });

    await expect(
      router.lightweight([{ role: "user", content: "test" }])
    ).rejects.toThrow();
  });
});
