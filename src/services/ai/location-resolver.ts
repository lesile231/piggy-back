import { eq, and, ilike, sql, ne, notInArray } from "drizzle-orm";
import type { Database } from "@/lib/db/client";
import type { LLMRouter } from "./llm-router";
import type {
  ChatMessage,
  ResolvedLocation,
  Resolution,
  ResolutionMatch,
} from "@/types/ai";
import { locationAliases, tourismSpots, resolutionLogs } from "@/lib/db/schema";
import type { EmbeddingProvider } from "@/lib/external/embedding/types";
import type { SpotRepository } from "@/services/tourism/spot.repository";
import { normalize } from "@/lib/utils/normalizer";
import { romanizeToHangul } from "@/lib/utils/romanize-to-hangul";
import { findClosestByJamo } from "@/lib/utils/jamo-match";
import { determineAction } from "./resolve-action";

const MIN_CONFIDENCE = 0.5;
// TODO[MVP]: When spots exceed this limit, implement category-based filtering or embedding pre-filter
const MAX_LLM_CANDIDATES = 50;
const NEARBY_RADIUS_KM = 7;
const NEARBY_LIMIT = 4;
const NEARBY_CONFIDENCE = 0.85;
/** Area search: wider radius, more results, all equal confidence */
const AREA_RADIUS_KM = 10;
const AREA_LIMIT = 8;

export class LocationResolver {
  constructor(
    private db: Database,
    private router: LLMRouter,
    private embeddingProvider?: EmbeddingProvider,
    private spotRepo?: SpotRepository,
  ) {}

  /**
   * Full resolution pipeline returning §4.2 Resolution type.
   * Stage 1: Normalization (applied to query before all stages)
   * Stage 2: Alias dictionary lookup
   * Stage 3: Romanization reverse-conversion
   * Stage 4: Phonetic approximate matching
   * Stage 5: Semantic search fallback (embedding + LLM)
   */
  async resolve(
    query: string,
    language: string,
    context?: { category?: string },
  ): Promise<Resolution> {
    const normalizedQuery = normalize(query);

    const resolution: Resolution = {
      query,
      normalizedQuery,
      detectedLang: language,
      stage: null,
      action: "empty",
      matches: [],
    };

    if (!normalizedQuery) return resolution;

    // Skip overly generic queries (city names, common nouns)
    if (LocationResolver.GENERIC_QUERIES.has(normalizedQuery)) return resolution;

    // Stage 2: Alias dictionary lookup (Stage 1 normalization applied inline)
    const aliasResult = await this.searchByAlias(normalizedQuery);
    if (aliasResult.matches.length > 0) {
      const enriched = await this.enrichWithNearby(aliasResult.matches, aliasResult.isArea);
      resolution.stage = 2;
      resolution.matches = enriched;
      // Area queries always disambiguate (show all spots equally)
      resolution.action = aliasResult.isArea ? "disambiguate" : determineAction(enriched);
      return resolution;
    }

    // Stage 3: Romanization reverse-conversion
    const hangulFromRoman = romanizeToHangul(normalizedQuery);
    if (hangulFromRoman) {
      // Try alias lookup with the converted Hangul
      const stage3Result = await this.searchByAlias(
        normalize(hangulFromRoman),
      );
      if (stage3Result.matches.length > 0) {
        const enriched = await this.enrichWithNearby(stage3Result.matches, stage3Result.isArea);
        resolution.stage = 3;
        resolution.matches = enriched;
        resolution.action = stage3Result.isArea ? "disambiguate" : determineAction(enriched);
        return resolution;
      }
    }

    // Stage 4: Phonetic approximate matching (jamo Levenshtein)
    const jamoQuery = hangulFromRoman || normalizedQuery;
    if (jamoQuery) {
      const jamoMatches = await this.searchByJamo(jamoQuery);
      if (jamoMatches.length > 0) {
        resolution.stage = 4;
        resolution.matches = jamoMatches;
        resolution.action = determineAction(jamoMatches);
        return resolution;
      }
    }

    // Stage 5: Semantic search fallback (embedding + LLM)
    if (this.embeddingProvider && this.spotRepo) {
      const embeddingMatches = await this.searchByEmbedding(query);
      if (embeddingMatches.length > 0) {
        resolution.stage = 5;
        resolution.matches = embeddingMatches;
        resolution.action = determineAction(embeddingMatches);
        await this.logResolution(query, normalizedQuery, language, resolution);
        return resolution;
      }
    }

    const llmMatches = await this.resolveWithLLM(query, language, context);
    if (llmMatches.length > 0) {
      resolution.stage = 5;
      resolution.matches = llmMatches;
      resolution.action = determineAction(llmMatches);
      // Self-learning: cache high-confidence resolution as alias
      const topLlm = llmMatches[0];
      if (topLlm && topLlm.confidence >= 0.6) {
        await this.cacheAsAlias(normalizedQuery, language, topLlm.placeId);
      }
      await this.logResolution(query, normalizedQuery, language, resolution);
      return resolution;
    }

    // All stages failed — log for manual review queue
    await this.logResolution(query, normalizedQuery, language, resolution);
    return resolution;
  }

  /**
   * Legacy resolve method for backward compatibility with bot services.
   */
  async resolveLegacy(
    query: string,
    language: string,
    context?: { category?: string },
  ): Promise<ResolvedLocation | null> {
    const result = await this.resolve(query, language, context);
    const match = result.matches[0];
    if (!match) return null;
    const sourceMap: Record<number, ResolvedLocation["source"]> = {
      2: "alias",
      3: "alias",
      4: "alias",
      5: "gpt",
    };
    return {
      spotId: match.placeId,
      spotName: match.nameKo,
      confidence: match.confidence,
      source: sourceMap[result.stage ?? 5] ?? "gpt",
    };
  }

  /**
   * Stage 2: Search alias dictionary with normalized query.
   * Searches across ALL languages — the alias text itself determines language.
   * Normalization is applied to both the query (caller) and aliases (SQL-side).
   */
  private async searchByAlias(
    normalizedQuery: string,
  ): Promise<{ matches: ResolutionMatch[]; isArea: boolean }> {
    try {
      const results = await this.db
        .select({
          spotId: tourismSpots.id,
          nameKo: tourismSpots.nameKo,
          names: tourismSpots.names,
          latitude: tourismSpots.latitude,
          longitude: tourismSpots.longitude,
          aliasType: locationAliases.type,
        })
        .from(locationAliases)
        .innerJoin(tourismSpots, eq(locationAliases.spotId, tourismSpots.id))
        .where(
          sql`lower(regexp_replace(unaccent(${locationAliases.alias}), '[\\s\\-''\\._·]', '', 'g')) = ${normalizedQuery}`,
        )
        .limit(5);

      if (results.length === 0) return { matches: [], isArea: false };

      const isArea = results.some((r) => r.aliasType === "area");

      // Deduplicate by placeId (multiple alias rows may match the same spot)
      const seen = new Set<string>();
      const matches: ResolutionMatch[] = [];
      for (const r of results) {
        if (seen.has(r.spotId)) continue;
        seen.add(r.spotId);
        const names = (r.names ?? {}) as Record<string, string>;
        matches.push({
          placeId: r.spotId,
          nameKo: r.nameKo,
          nameLocalized: names["en"] ?? r.nameKo,
          romanized: names["en"] ?? "",
          confidence: 1.0,
          latitude: r.latitude ? Number(r.latitude) : undefined,
          longitude: r.longitude ? Number(r.longitude) : undefined,
        });
      }
      return { matches, isArea };
    } catch {
      return { matches: [], isArea: false };
    }
  }

  /**
   * Enrich a single alias match with nearby spots.
   * - isArea=false: primary spot + nearby as secondary (lower confidence)
   * - isArea=true: ALL spots in radius returned with equal confidence ("disambiguate")
   */
  private async enrichWithNearby(
    matches: ResolutionMatch[],
    isArea = false,
  ): Promise<ResolutionMatch[]> {
    // Only enrich when there's a single high-confidence match with coordinates
    if (matches.length !== 1) return matches;
    const top = matches[0];
    if (!top || top.latitude == null || top.longitude == null) return matches;

    const radiusKm = isArea ? AREA_RADIUS_KM : NEARBY_RADIUS_KM;
    const limit = isArea ? AREA_LIMIT : NEARBY_LIMIT;

    try {
      const rows = await this.db.execute(sql`
        SELECT id, name_ko, names, latitude, longitude,
          (6371 * acos(
            cos(radians(${top.latitude})) * cos(radians(latitude)) *
            cos(radians(longitude) - radians(${top.longitude})) +
            sin(radians(${top.latitude})) * sin(radians(latitude))
          )) AS distance_km
        FROM tourism_spots
        WHERE is_active = true
          AND latitude IS NOT NULL
          AND longitude IS NOT NULL
          AND id != ${top.placeId}
          AND (6371 * acos(
            cos(radians(${top.latitude})) * cos(radians(latitude)) *
            cos(radians(longitude) - radians(${top.longitude})) +
            sin(radians(${top.latitude})) * sin(radians(latitude))
          )) <= ${radiusKm}
        ORDER BY distance_km
        LIMIT ${limit}
      `);

      if (!rows.rows || rows.rows.length === 0) return matches;

      const nearbyConfidence = isArea ? 1.0 : NEARBY_CONFIDENCE;
      const nearby: ResolutionMatch[] = (rows.rows as Record<string, unknown>[]).map((r) => {
        const names = (r.names ?? {}) as Record<string, string>;
        return {
          placeId: r.id as string,
          nameKo: r.name_ko as string,
          nameLocalized: names["en"] ?? (r.name_ko as string),
          romanized: names["en"] ?? "",
          confidence: nearbyConfidence,
        };
      });

      return [...matches, ...nearby];
    } catch {
      return matches;
    }
  }

  /**
   * Stage 4: Jamo-based approximate matching.
   * Fetches all active spots and ranks by jamo Levenshtein similarity.
   */
  private async searchByJamo(
    hangulQuery: string,
  ): Promise<ResolutionMatch[]> {
    try {
      const spots = await this.db
        .select({
          id: tourismSpots.id,
          nameKo: tourismSpots.nameKo,
          names: tourismSpots.names,
        })
        .from(tourismSpots)
        .where(eq(tourismSpots.isActive, true))
        .limit(MAX_LLM_CANDIDATES);

      const candidates = findClosestByJamo(
        hangulQuery,
        spots,
        MIN_CONFIDENCE,
        3,
      );

      return candidates.map((c) => {
        const spot = spots.find((s) => s.id === c.id);
        const names = (spot?.names ?? {}) as Record<string, string>;
        return {
          placeId: c.id,
          nameKo: c.nameKo,
          nameLocalized: names["en"] ?? c.nameKo,
          romanized: names["en"] ?? "",
          confidence: c.similarity,
        };
      });
    } catch {
      return [];
    }
  }

  private async resolveWithLLM(
    query: string,
    language: string,
    context?: { category?: string },
  ): Promise<ResolutionMatch[]> {
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
      return [];
    }

    if (candidates.length === 0) return [];

    const candidateList = candidates
      .map((c, i) => `${i + 1}. ${c.nameKo} (${JSON.stringify(c.names)})`)
      .join("\n");

    const messages: ChatMessage[] = [
      {
        role: "system",
        content: `You are a Busan location resolver. Match the user's query to candidate locations.
Respond with JSON: {"matches": [{"matchIndex": <1-based>, "confidence": 0.0-1.0}], "reasoning": "..."}
Return up to 3 matches sorted by confidence. If no match, return {"matches": [], "reasoning": "..."}.
matchIndex is the 1-based index from the candidate list.`,
      },
      {
        role: "user",
        content: `Query: "${query}" (Language: ${language})
${context?.category ? `Category hint: ${context.category}` : ""}

Candidates:
${candidateList}

Match the query to the best candidate(s).`,
      },
    ];

    try {
      const response = await this.router.lightweightJson(messages);
      const parsed = JSON.parse(response.content);

      // Support both old single-match and new multi-match format
      const rawMatches: { matchIndex: number | null; confidence: number }[] =
        Array.isArray(parsed.matches)
          ? parsed.matches
          : parsed.matchIndex != null
            ? [{ matchIndex: parsed.matchIndex, confidence: parsed.confidence }]
            : [];

      const results: ResolutionMatch[] = [];
      for (const m of rawMatches) {
        if (m.matchIndex === null || m.confidence < MIN_CONFIDENCE) continue;
        const idx = parseInt(String(m.matchIndex), 10) - 1;
        const candidate = candidates[idx];
        if (!candidate) continue;

        const names = (candidate.names ?? {}) as Record<string, string>;
        results.push({
          placeId: candidate.id,
          nameKo: candidate.nameKo,
          nameLocalized: names["en"] ?? candidate.nameKo,
          romanized: names["en"] ?? "",
          confidence: m.confidence,
        });
      }

      return results;
    } catch {
      return [];
    }
  }

  private async searchByEmbedding(
    query: string,
  ): Promise<ResolutionMatch[]> {
    if (!this.embeddingProvider || !this.spotRepo) return [];

    try {
      const [queryVector] = await this.embeddingProvider.embed([query]);
      if (!queryVector || queryVector.length === 0) return [];

      const matches = await this.spotRepo.searchBySimilarity(
        queryVector,
        0.5,
        3,
      );
      if (matches.length === 0) return [];

      return matches.map((m) => ({
        placeId: m.id,
        nameKo: m.nameKo,
        nameLocalized:
          (m.names as Record<string, string>)["en"] ?? m.nameKo,
        romanized:
          (m.names as Record<string, string>)["en"] ?? "",
        confidence: m.similarity,
      }));
    } catch {
      return [];
    }
  }

  /**
   * §4.1 Stage 5 logging: record queries that reach Stage 5 or fail entirely.
   * Successful Stage 5 resolutions become alias dictionary candidates.
   * Failed queries enter the manual review queue.
   */
  private async logResolution(
    query: string,
    normalizedQuery: string,
    language: string,
    resolution: Resolution,
  ): Promise<void> {
    try {
      const top = resolution.matches[0];
      await this.db.insert(resolutionLogs).values({
        query,
        normalizedQuery,
        language,
        resolvedStage: resolution.stage,
        resolvedSpotId: top?.placeId ?? null,
        confidence: top?.confidence?.toString() ?? null,
        success: resolution.matches.length > 0,
      });
    } catch {
      // Non-critical: silently fail if logging fails
    }
  }

  /**
   * Words too generic to resolve — city names, single common nouns.
   * These bypass LLM and return empty so the UI can show popular chips instead.
   */
  private static readonly GENERIC_QUERIES = new Set([
    "busan", "pusan", "seoul", "korea", "southkorea",
    "beach", "temple", "market", "park", "food", "restaurant",
    "hotel", "station", "airport", "bus", "taxi", "train",
    "부산", "서울", "한국",
  ]);

  private async cacheAsAlias(
    normalizedQuery: string,
    language: string,
    spotId: string,
  ): Promise<void> {
    // Skip overly generic or short queries
    if (normalizedQuery.length < 4) return;
    if (LocationResolver.GENERIC_QUERIES.has(normalizedQuery)) return;

    try {
      await this.db
        .insert(locationAliases)
        .values({
          spotId,
          alias: normalizedQuery,
          language,
          source: "ai_generated",
        })
        .onConflictDoNothing();
    } catch {
      // Non-critical: silently fail if caching fails
    }
  }
}
