import { eq, and, ilike } from "drizzle-orm";
import type { Database } from "@/lib/db/client";
import type { LLMRouter } from "./llm-router";
import type { ChatMessage, ResolvedLocation } from "@/types/ai";
import { locationAliases, tourismSpots } from "@/lib/db/schema";
import type { EmbeddingProvider } from "@/lib/external/embedding/types";
import type { SpotRepository } from "@/services/tourism/spot.repository";

const MIN_CONFIDENCE = 0.5;
// TODO[MVP]: When spots exceed this limit, implement category-based filtering or embedding pre-filter
const MAX_LLM_CANDIDATES = 50;

export class LocationResolver {
  constructor(
    private db: Database,
    private router: LLMRouter,
    private embeddingProvider?: EmbeddingProvider,
    private spotRepo?: SpotRepository,
  ) {}

  async resolve(
    query: string,
    language: string,
    context?: { category?: string },
  ): Promise<ResolvedLocation | null> {
    // Stage 1: DB alias search
    const aliasResult = await this.searchByAlias(query, language);
    if (aliasResult) return aliasResult;

    // Stage 2: Embedding similarity search
    if (this.embeddingProvider && this.spotRepo) {
      const embeddingResult = await this.searchByEmbedding(query);
      if (embeddingResult) return embeddingResult;
    }

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
        .limit(MAX_LLM_CANDIDATES);
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
Respond with JSON: {"matchIndex": <number-or-null>, "confidence": 0.0-1.0, "reasoning": "..."}
matchIndex is the 1-based index from the candidate list, or null if no match.`,
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

      if (parsed.matchIndex === null || parsed.confidence < MIN_CONFIDENCE) return null;

      // Find the matching candidate (1-based index)
      const matchIndex = parseInt(String(parsed.matchIndex), 10) - 1;
      const match = candidates[matchIndex];
      if (!match) return null;

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

  private async searchByEmbedding(
    query: string,
  ): Promise<ResolvedLocation | null> {
    if (!this.embeddingProvider || !this.spotRepo) return null;

    try {
      const [queryVector] = await this.embeddingProvider.embed([query]);
      if (!queryVector || queryVector.length === 0) return null;

      const matches = await this.spotRepo.searchBySimilarity(queryVector, 0.8, 1);
      if (matches.length === 0 || !matches[0]) return null;

      return {
        spotId: matches[0].id,
        spotName: matches[0].nameKo,
        confidence: matches[0].similarity,
        source: "embedding",
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
