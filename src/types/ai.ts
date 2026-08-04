export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMResponse {
  content: string;
  tokensUsed: { input: number; output: number };
  model: string;
  provider: string;
}

export interface ResolvedLocation {
  spotId: string;
  spotName: string;
  confidence: number;
  source: "alias" | "embedding" | "gpt";
}

export type Intent =
  | "tourism"
  | "transit"
  | "booking"
  | "general_info"
  | "greeting"
  | "off_topic";

export interface ClassificationResult {
  intent: Intent;
  confidence: number;
  extractedEntities?: {
    location?: string;
    category?: string;
    date?: string;
  };
}
