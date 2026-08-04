import Together from "together-ai";
import type { LLMProvider, LLMChatParams } from "../llm-provider";
import type { LLMResponse } from "@/types/ai";

export class TogetherProvider implements LLMProvider {
  private client: Together;

  constructor(apiKey: string) {
    this.client = new Together({ apiKey });
  }

  async chat(params: LLMChatParams): Promise<LLMResponse> {
    const response = await this.client.chat.completions.create({
      model: params.model,
      messages: params.messages,
      temperature: params.temperature ?? 0.7,
      max_tokens: params.maxTokens ?? 1024,
      response_format: params.responseFormat === "json"
        ? { type: "json_object" }
        : undefined,
    });

    const choice = response.choices[0];
    if (!choice?.message?.content) {
      throw new Error("Together returned empty response");
    }

    return {
      content: choice.message.content,
      tokensUsed: {
        input: response.usage?.prompt_tokens ?? 0,
        output: response.usage?.completion_tokens ?? 0,
      },
      model: params.model,
      provider: "together",
    };
  }
}
