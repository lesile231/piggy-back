import type { LLMRouter } from "./llm-router";
import type { IntentClassifier } from "./intent-classifier";
import type { IntentRouter } from "./intent-router";
import type { ChatMessage } from "@/types/ai";
import type { OutgoingMessage } from "@/services/bot/types";
import { localize } from "@/types/common";

const OFF_TOPIC_MESSAGES: Record<string, string> = {
  en: "I'm your Busan travel assistant! I can help with tourist spots, restaurants, transportation, and events. What would you like to know about Busan?",
  ja: "私は釜山の旅行アシスタントです！観光地、レストラン、交通、イベントのお手伝いができます。釜山について何を知りたいですか？",
  zh: "我是您的釜山旅行助手！我可以帮助您了解旅游景点、餐厅、交通和活动。您想了解釜山的什么信息？",
  ko: "저는 부산 여행 도우미입니다! 관광지, 맛집, 교통, 행사 등을 도와드릴 수 있습니다. 부산에 대해 무엇이 궁금하세요?",
};

const GREETING_MESSAGES: Record<string, string> = {
  en: "Hello! I'm PiggyBack, your Busan travel buddy. Ask me anything about Busan — tourist spots, food, transportation, or things to do!",
  ja: "こんにちは！PiggyBackです、釜山の旅行ガイドです。観光地、グルメ、交通、アクティビティなど、何でも聞いてください！",
  zh: "你好！我是PiggyBack，您的釜山旅行伙伴。关于釜山的旅游景点、美食、交通或活动，尽管问我！",
  ko: "안녕하세요! PiggyBack입니다. 부산의 관광지, 맛집, 교통, 즐길 거리 등 무엇이든 물어보세요!",
};

export interface ChatResponse {
  messages: OutgoingMessage[];
  tokensUsed: number;
}

export class ChatService {
  private intentRouter?: IntentRouter;

  constructor(
    private router: LLMRouter,
    private classifier: IntentClassifier,
  ) {}

  /**
   * Attach an IntentRouter to enable direct intent→service routing.
   * Without this, all intents fall back to LLM conversation.
   */
  setIntentRouter(intentRouter: IntentRouter): void {
    this.intentRouter = intentRouter;
  }

  async generateResponse(
    message: string,
    language: string,
    history?: ChatMessage[],
    userLocation?: { latitude: number; longitude: number },
  ): Promise<ChatResponse> {
    // Intent classification guard
    const classification = await this.classifier.classify(message, language, history);

    if (classification.intent === "off_topic") {
      return {
        messages: [{ type: "text", text: localize(OFF_TOPIC_MESSAGES, language) }],
        tokensUsed: 0,
      };
    }

    if (classification.intent === "greeting") {
      return {
        messages: [{ type: "text", text: localize(GREETING_MESSAGES, language) }],
        tokensUsed: 0,
      };
    }

    // §6.1: Route intents to specific service actions when IntentRouter is available
    if (this.intentRouter) {
      const msgs = await this.intentRouter.route(
        classification,
        message,
        language,
        userLocation,
      );
      return { messages: msgs, tokensUsed: 0 };
    }

    // Fallback: LLM conversation (when IntentRouter is not wired)
    const messages: ChatMessage[] = [
      {
        role: "system",
        content: `You are PiggyBack, a friendly and knowledgeable Busan travel assistant chatbot.
You help international tourists visiting Busan, South Korea.
You can answer questions about: tourist spots, restaurants, cafes, beaches, temples, markets, transportation, directions, events, festivals, and general Busan travel tips.
Always respond in the user's language. Be concise and helpful.
If you mention a place, include a brief description and practical info when relevant (location, hours, price).
Do not make up information. If you're not sure, say so.`,
      },
    ];

    if (history && history.length > 0) {
      const recent = history.slice(-6);
      messages.push(...recent);
    }

    messages.push({ role: "user", content: message });

    const llmResponse = await this.router.conversation(messages);

    return {
      messages: [{ type: "text", text: llmResponse.content }],
      tokensUsed: llmResponse.tokensUsed.input + llmResponse.tokensUsed.output,
    };
  }
}
