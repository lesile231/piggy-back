import { type NextRequest } from "next/server";
import { getEnv } from "@/lib/env";
import { createDb } from "@/lib/db/client";
import { LineAdapter } from "@/services/bot/line.adapter";
import { SessionRepository } from "@/services/bot/session.repository";
import { FlowRepository } from "@/services/bot/flow/flow.repository";
import { FlowEngine } from "@/services/bot/flow/flow-engine";
import { MenuService } from "@/services/bot/menu.service";
import { MessageHandler } from "@/services/bot/message-handler";
import { ChatService } from "@/services/ai/chat.service";
import { LanguageService } from "@/services/ai/language.service";
import { LLMRouter } from "@/services/ai/llm-router";
import { GroqProvider } from "@/services/ai/providers/groq.provider";
import { TogetherProvider } from "@/services/ai/providers/together.provider";
import { IntentClassifier } from "@/services/ai/intent-classifier";
import { IntentRouter } from "@/services/ai/intent-router";
import { LocationResolver } from "@/services/ai/location-resolver";
import { EventRepository } from "@/services/tourism/event.repository";
import { SpotRepository } from "@/services/tourism/spot.repository";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest): Promise<Response> {
  const env = getEnv();

  const adapter = new LineAdapter({
    channelAccessToken: env.LINE_CHANNEL_ACCESS_TOKEN,
    channelSecret: env.LINE_CHANNEL_SECRET,
  });

  // Read body once as text
  const bodyText = await request.text();

  // Verify signature using the raw text
  const signature = request.headers.get("x-line-signature");
  if (!signature) {
    return new Response("Unauthorized", { status: 401 });
  }
  const { createHmac, timingSafeEqual } = await import("node:crypto");
  const expected = createHmac("sha256", env.LINE_CHANNEL_SECRET)
    .update(bodyText, "utf8")
    .digest("base64");
  const expectedBuf = Buffer.from(expected);
  const signatureBuf = Buffer.from(signature);
  const isValid = expectedBuf.length === signatureBuf.length &&
    (() => { try { return timingSafeEqual(expectedBuf, signatureBuf); } catch { return false; } })();
  if (!isValid) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Parse the same text as JSON
  const body = JSON.parse(bodyText);
  const messages = adapter.parseIncoming(body);

  if (messages.length === 0) {
    return new Response("OK", { status: 200 });
  }

  // Build dependencies
  const db = createDb(env.DATABASE_URL);
  const sessionRepo = new SessionRepository(db);
  const flowRepo = new FlowRepository(db);
  const flowEngine = new FlowEngine(flowRepo);
  const menuService = new MenuService(flowRepo);
  const languageService = new LanguageService();

  const primary = new GroqProvider(env.GROQ_API_KEY);
  const fallback = env.TOGETHER_API_KEY
    ? new TogetherProvider(env.TOGETHER_API_KEY)
    : primary;
  const router = new LLMRouter(primary, fallback, {
    lightModel: env.LLM_LIGHT_MODEL,
    chatModel: env.LLM_CHAT_MODEL,
  });
  const classifier = new IntentClassifier(router);
  const chatService = new ChatService(router, classifier);

  // §6.1: Wire IntentRouter with resolved services
  const locationResolver = new LocationResolver(db, router);
  const eventRepo = new EventRepository(db);
  const spotRepo = new SpotRepository(db);
  const intentRouter = new IntentRouter({
    locationResolver,
    eventRepo,
    spotRepo,
    appUrl: env.NEXT_PUBLIC_APP_URL,
  });
  chatService.setIntentRouter(intentRouter);

  const handler = new MessageHandler(
    sessionRepo, menuService, flowEngine, chatService, languageService,
  );

  for (const msg of messages) {
    try {
      await handler.handle(adapter, msg);
    } catch (error) {
      console.error("Failed to handle LINE message:", error);
    }
  }

  return new Response("OK", { status: 200 });
}
