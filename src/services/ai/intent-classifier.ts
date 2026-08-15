import type { LLMRouter } from "./llm-router";
import type { ChatMessage, ClassificationResult, Intent } from "@/types/ai";

const VALID_INTENTS: Intent[] = [
  "resolve_place", "how_to_get", "whats_on", "nearby",
  "fallback", "greeting", "off_topic",
];

const SYSTEM_PROMPT = `You are a Busan tourism intent classifier.
Classify the user's message into one of these intents:
- resolve_place: asking about a specific place, tourist spot, restaurant, temple, market, beach (includes any place name in any language)
- how_to_get: asking for directions, transportation, how to get somewhere
- whats_on: asking about events, festivals, what's happening, things to do today
- nearby: asking for nearby places, "near me", around here, what's close
- greeting: greetings, thanks, goodbyes, "hello", "hi"
- off_topic: anything unrelated to Busan tourism/travel

Extract entities if present: location name, category, date.

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
        : "fallback";

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
      return { intent: "fallback", confidence: 0 };
    }
  }
}
