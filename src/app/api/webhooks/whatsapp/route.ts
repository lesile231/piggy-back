import { type NextRequest } from "next/server";
import { getEnv } from "@/lib/env";
import { createDb } from "@/lib/db/client";
import { WhatsAppAdapter } from "@/services/bot/whatsapp.adapter";
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

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<Response> {
  const env = getEnv();
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === env.WHATSAPP_VERIFY_TOKEN && challenge) {
    return new Response(challenge, { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

export async function POST(request: NextRequest): Promise<Response> {
  const env = getEnv();

  const adapter = new WhatsAppAdapter({
    phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID,
    accessToken: env.WHATSAPP_ACCESS_TOKEN,
    verifyToken: env.WHATSAPP_VERIFY_TOKEN,
    appSecret: env.WHATSAPP_APP_SECRET,
  });

  // Read body once as text
  const bodyText = await request.text();

  // Verify signature using the raw text
  const signature = request.headers.get("x-hub-signature-256");
  if (!signature) {
    return new Response("Unauthorized", { status: 401 });
  }
  const sig = signature.replace("sha256=", "");
  const { verifyHmacSignature } = await import("@/lib/utils/crypto");
  const isValid = verifyHmacSignature(bodyText, sig, env.WHATSAPP_APP_SECRET, "sha256");
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

  const handler = new MessageHandler(
    sessionRepo, menuService, flowEngine, chatService, languageService,
  );

  // Process messages (sequentially to maintain order)
  for (const msg of messages) {
    try {
      await handler.handle(adapter, msg);
    } catch (error) {
      console.error("Failed to handle WhatsApp message:", error);
    }
  }

  return new Response("OK", { status: 200 });
}
