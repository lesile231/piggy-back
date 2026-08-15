import type { Database } from "@/lib/db/client";
import type { LLMRouter } from "./llm-router";
import { locationAliases } from "@/lib/db/schema";

interface SpotInput {
  id: string;
  nameKo: string;
  names: Record<string, string>;
  addressKo?: string | null;
}

interface GeneratedAlias {
  alias: string;
  language: string;
}

const TARGET_LANGUAGES = ["en", "ja", "zh", "es", "ko"] as const;

function buildPrompt(spot: SpotInput): string {
  const namesList = Object.entries(spot.names)
    .map(([lang, name]) => `${lang}: ${name}`)
    .join(", ");

  return [
    "Generate multilingual aliases for this tourism spot.",
    `Korean name: ${spot.nameKo}`,
    namesList ? `Other names: ${namesList}` : "",
    spot.addressKo ? `Address: ${spot.addressKo}` : "",
    "",
    `For each language (${TARGET_LANGUAGES.join(", ")}), generate 3-5 aliases.`,
    "Include: official name, abbreviations, colloquial forms, romanized variants, and common descriptive expressions.",
    "For Korean, include common abbreviations and alternate spellings.",
    "For English, include romanized forms (with/without spaces and hyphens).",
    "",
    'Return JSON: { "aliases": [ { "alias": "string", "language": "string" } ] }',
    "Only return the JSON, no other text.",
  ]
    .filter(Boolean)
    .join("\n");
}

function parseAliases(content: string): GeneratedAlias[] {
  const parsed = JSON.parse(content);

  if (!parsed || !Array.isArray(parsed.aliases)) {
    return [];
  }

  return parsed.aliases.filter(
    (a: unknown): a is GeneratedAlias =>
      typeof a === "object" &&
      a !== null &&
      "alias" in a &&
      "language" in a &&
      typeof (a as GeneratedAlias).alias === "string" &&
      typeof (a as GeneratedAlias).language === "string" &&
      (a as GeneratedAlias).alias.trim().length > 0,
  );
}

export class AliasGenerator {
  constructor(
    private db: Database,
    private router: LLMRouter,
  ) {}

  async generateAndSave(spot: SpotInput): Promise<number> {
    let aliases: GeneratedAlias[];
    try {
      const response = await this.router.lightweightJson([
        { role: "system", content: "You are a multilingual tourism naming expert. Generate aliases for tourism spots." },
        { role: "user", content: buildPrompt(spot) },
      ]);
      aliases = parseAliases(response.content);
    } catch {
      return 0;
    }

    if (aliases.length === 0) return 0;

    const values = aliases.map(({ alias, language }) => ({
      spotId: spot.id,
      alias: alias.trim(),
      language,
      source: "ai_generated",
    }));

    try {
      await this.db
        .insert(locationAliases)
        .values(values)
        .onConflictDoNothing();
    } catch {
      // Non-critical: batch insert failed
      return 0;
    }

    return values.length;
  }
}
