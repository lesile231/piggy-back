import { eq, and, ilike } from "drizzle-orm";
import type { Database } from "@/lib/db/client";
import type { LLMRouter } from "./llm-router";
import type { ChatMessage, ResolvedLocation } from "@/types/ai";
import { locationAliases, tourismSpots } from "@/lib/db/schema";

const MIN_CONFIDENCE = 0.5;

export class LocationResolver {
  constructor(
    private db: Database,
    private router: LLMRouter,
  ) {}

  async resolve(
    query: string,
    language: string,
    context?: { category?: string },
  ): Promise<ResolvedLocation | null> {
    // Stage 1: DB alias search
    const aliasResult = await this.searchByAlias(query, language);
    if (aliasResult) return aliasResult;

    // Stage 2: Embedding search (TODO[MVP]: implement in SP3 when embedding pipeline is ready)
    // For now, skip to Stage 3

    // Stage 3: LLM inference
    const llmResult = await this.resolveWithLLM(query, language, context);
    if (llmResult) {
      // Self-learning: cache successful resolution as alias
      await this.cacheAsAlias(query, language, llmResult.spotId);
    }
    return llmResult;
  }

  private async searchByAlias(
    query: string,
    language: string,
  ): Promise<ResolvedLocation | null> {
    try {
      const results = await this.db
        .select({
          spotId: locationAliases.spotId,
          alias: locationAliases.alias,
          spotName: tourismSpots.nameKo,
        })
        .from(locationAliases)
        .innerJoin(tourismSpots, eq(locationAliases.spotId, tourismSpots.id))
        .where(
          and(
            ilike(locationAliases.alias, query),
            eq(locationAliases.language, language),
          ),
        )
        .limit(1);

      if (results.length === 0 || !results[0]) return null;

      return {
        spotId: results[0].spotId!,
        spotName: results[0].spotName,
        confidence: 1.0,
        source: "alias",
      };
    } catch {
      return null;
    }
  }

  private async resolveWithLLM(
    query: string,
    language: string,
    context?: { category?: string },
  ): Promise<ResolvedLocation | null> {
    // Fetch candidate spots from DB
    let candidates: { id: string; nameKo: string; names: unknown }[];
    try {
      candidates = await this.db
        .select({
          id: tourismSpots.id,
          nameKo: tourismSpots.nameKo,
          names: tourismSpots.names,
        })
        .from(tourismSpots)
        .where(eq(tourismSpots.isActive, true))
        .limit(50);
    } catch {
      return null;
    }

    if (candidates.length === 0) return null;

    const candidateList = candidates
      .map((c, i) => `${i + 1}. ${c.nameKo} (${JSON.stringify(c.names)})`)
      .join("\n");

    const messages: ChatMessage[] = [
      {
        role: "system",
        content: `You are a Busan location resolver. Match the user's query to one of the candidate locations.
Respond with JSON: {"spotId": "uuid-or-null", "confidence": 0.0-1.0, "reasoning": "..."}
If no match, set spotId to null.`,
      },
      {
        role: "user",
        content: `Query: "${query}" (Language: ${language})
${context?.category ? `Category hint: ${context.category}` : ""}

Candidates:
${candidateList}

Match the query to the best candidate. Use the candidate's array index to identify it.`,
      },
    ];

    try {
      const response = await this.router.lightweightJson(messages);
      const parsed = JSON.parse(response.content);

      if (!parsed.spotId || parsed.confidence < MIN_CONFIDENCE) return null;

      // Find the matching candidate
      const matchIndex = parseInt(parsed.spotId, 10) - 1;
      const match = candidates[matchIndex];
      if (!match) {
        // Try direct UUID match
        const directMatch = candidates.find((c) => c.id === parsed.spotId);
        if (!directMatch) return null;
        return {
          spotId: directMatch.id,
          spotName: directMatch.nameKo,
          confidence: parsed.confidence,
          source: "gpt",
        };
      }

      return {
        spotId: match.id,
        spotName: match.nameKo,
        confidence: parsed.confidence,
        source: "gpt",
      };
    } catch {
      return null;
    }
  }

  private async cacheAsAlias(
    query: string,
    language: string,
    spotId: string,
  ): Promise<void> {
    try {
      await this.db
        .insert(locationAliases)
        .values({
          spotId,
          alias: query.toLowerCase(),
          language,
          source: "ai_generated",
        })
        .onConflictDoNothing();
    } catch {
      // Non-critical: silently fail if caching fails
    }
  }
}
