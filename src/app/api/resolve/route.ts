import { NextRequest, NextResponse } from "next/server";
import { createDb } from "@/lib/db/client";
import { getEnv } from "@/lib/env";
import { LocationResolver } from "@/services/ai/location-resolver";
import { GroqProvider } from "@/services/ai/providers/groq.provider";
import { TogetherProvider } from "@/services/ai/providers/together.provider";
import { LLMRouter } from "@/services/ai/llm-router";
import type { Resolution } from "@/types/ai";

/**
 * GET /api/resolve?q=...&lang=en
 *
 * Resolution API endpoint (§4.2).
 * Runs the search resolution pipeline and returns a Resolution object.
 * Used by the transshipment strip (§5.4) for real-time query resolution.
 */
export async function GET(request: NextRequest): Promise<NextResponse<Resolution | { error: string }>> {
  const query = request.nextUrl.searchParams.get("q")?.trim();
  const lang = request.nextUrl.searchParams.get("lang") ?? "en";

  if (!query) {
    return NextResponse.json(
      { query: "", normalizedQuery: "", detectedLang: lang, stage: null, action: "empty", matches: [] } satisfies Resolution,
      { status: 200 },
    );
  }

  try {
    const env = getEnv();
    const db = createDb(env.DATABASE_URL);

    // Set up LLM router for Stage 5 fallback
    const primary = new GroqProvider(env.GROQ_API_KEY);
    const fallback = env.TOGETHER_API_KEY
      ? new TogetherProvider(env.TOGETHER_API_KEY)
      : primary;
    const router = new LLMRouter(primary, fallback, {
      lightModel: env.LLM_LIGHT_MODEL,
      chatModel: env.LLM_CHAT_MODEL,
    });

    const resolver = new LocationResolver(db, router);
    const resolution = await resolver.resolve(query, lang);

    return NextResponse.json(resolution);
  } catch (err) {
    console.error("Resolution failed:", err);
    return NextResponse.json(
      { error: "Resolution failed" },
      { status: 500 },
    );
  }
}
