import type { LLMProvider } from "./llm-provider";
import type { ChatMessage, LLMResponse } from "@/types/ai";

interface LLMRouterConfig {
  lightModel: string;
  chatModel: string;
}

export class LLMRouter {
  constructor(
    private primary: LLMProvider,
    private fallback: LLMProvider,
    private config: LLMRouterConfig,
  ) {}

  async lightweight(messages: ChatMessage[]): Promise<LLMResponse> {
    return this.withFallback({
      model: this.config.lightModel,
      messages,
      temperature: 0.1,
      maxTokens: 512,
    });
  }

  async conversation(messages: ChatMessage[]): Promise<LLMResponse> {
    return this.withFallback({
      model: this.config.chatModel,
      messages,
      temperature: 0.7,
      maxTokens: 1024,
    });
  }

  async lightweightJson(messages: ChatMessage[]): Promise<LLMResponse> {
    return this.withFallback({
      model: this.config.lightModel,
      messages,
      temperature: 0.1,
      maxTokens: 512,
      responseFormat: "json",
    });
  }

  private async withFallback(
    params: Parameters<LLMProvider["chat"]>[0]
  ): Promise<LLMResponse> {
    try {
      return await this.primary.chat(params);
    } catch (primaryError) {
      console.warn("Primary LLM failed, falling back:", primaryError);
      try {
        return await this.fallback.chat(params);
      } catch (fallbackError) {
        const primaryMsg = primaryError instanceof Error ? primaryError.message : String(primaryError);
        const fallbackMsg = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
        throw new Error(
          `Both LLM providers failed. Primary: ${primaryMsg}. Fallback: ${fallbackMsg}`,
          { cause: { primaryError, fallbackError } }
        );
      }
    }
  }
}
