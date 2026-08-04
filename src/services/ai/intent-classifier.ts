import type { LLMRouter } from "./llm-router";
import type { ChatMessage, ClassificationResult, Intent } from "@/types/ai";

const VALID_INTENTS: Intent[] = [
  "tourism", "transit", "booking", "general_info", "greeting", "off_topic",
];

const SYSTEM_PROMPT = `You are a Busan tourism intent classifier.
Classify the user's message into one of these intents:
- tourism: questions about tourist spots, restaurants, cafes, attractions
- transit: questions about transportation, directions, routes
- booking: questions about reservations, tickets, activities
- general_info: general Busan travel info (weather, currency, tips)
- greeting: greetings, thanks, goodbyes
- off_topic: anything unrelated to Busan tourism/travel

Extract entities if present: location, category, date.

Respond with JSON only:
{"intent": "...", "confidence": 0.0-1.0, "entities": {"location": "...", "category": "...", "date": "..."}}`;

export class IntentClassifier {
  constructor(private router: LLMRouter) {}

  async classify(
    message: string,
    language: string,
    history?: ChatMessage[],
  ): Promise<ClassificationResult> {
    const messages: ChatMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
    ];

    if (history && history.length > 0) {
      const recent = history.slice(-2);
      messages.push({
        role: "user",
        content: `Previous context: ${recent.map((m) => m.content).join(" | ")}`,
      });
    }

    messages.push({
      role: "user",
      content: `Language: ${language}\nMessage: ${message}`,
    });

    try {
      const response = await this.router.lightweightJson(messages);
      const parsed = JSON.parse(response.content);

      const intent: Intent = VALID_INTENTS.includes(parsed.intent)
        ? parsed.intent
        : "off_topic";

      return {
        intent,
        confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
        extractedEntities: parsed.entities
          ? {
              location: parsed.entities.location || undefined,
              category: parsed.entities.category || undefined,
              date: parsed.entities.date || undefined,
            }
          : undefined,
      };
    } catch {
      return { intent: "off_topic", confidence: 0 };
    }
  }
}
