import type { ChatMessage, LLMResponse } from "@/types/ai";

export interface LLMChatParams {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  responseFormat?: "text" | "json";
}

export interface LLMProvider {
  chat(params: LLMChatParams): Promise<LLMResponse>;
}
