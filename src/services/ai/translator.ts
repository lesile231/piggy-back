import type { LLMRouter } from "./llm-router";

const SYSTEM_PROMPT = [
  "You are a professional translator for Busan tourism content.",
  "Translate the given fields into the requested target languages.",
  "Preserve proper nouns (place names, brand names) appropriately for each language.",
  "Use natural, tourist-friendly language.",
  "Return ONLY valid JSON matching the requested structure.",
].join("\n");

/**
 * Translates localized content fields into missing target languages via LLM.
 * Non-critical: callers should catch errors and proceed without translations.
 */
export class Translator {
  constructor(private router: LLMRouter) {}

  /**
   * Translate multiple fields at once, filling in missing locales.
   * @param fields - e.g. { names: { ko: "해운대", en: "Haeundae" }, description: { ko: "..." } }
   * @param targetLocales - all locales that should be present (e.g. ALL_LOCALES)
   * @returns merged object with original + translated values
   */
  async translateFields(
    fields: Record<string, Record<string, string>>,
    targetLocales: string[],
  ): Promise<Record<string, Record<string, string>>> {
    // Build a map of what needs translating
    const missing: Record<string, string[]> = {};
    let hasMissing = false;

    for (const [field, values] of Object.entries(fields)) {
      const missingLocales = targetLocales.filter((loc) => !values[loc]);
      if (missingLocales.length > 0) {
        missing[field] = missingLocales;
        hasMissing = true;
      }
    }

    if (!hasMissing) return fields;

    // Find source language (prefer ko, then en, then first available)
    const sourceLang = this.pickSourceLang(fields);
    if (!sourceLang) return fields;

    const prompt = this.buildPrompt(fields, missing, sourceLang);

    const response = await this.router.conversationJson([
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ]);

    const parsed = JSON.parse(response.content);

    // Merge translations into original fields
    const result: Record<string, Record<string, string>> = {};
    for (const [field, values] of Object.entries(fields)) {
      result[field] = { ...values };
      const translated = parsed[field];
      if (translated && typeof translated === "object") {
        for (const locale of missing[field] ?? []) {
          const val = translated[locale];
          if (typeof val === "string" && val.trim().length > 0) {
            result[field][locale] = val.trim();
          }
        }
      }
    }

    return result;
  }

  private pickSourceLang(fields: Record<string, Record<string, string>>): string | null {
    for (const preferred of ["ko", "en", "ja", "zh"]) {
      const hasContent = Object.values(fields).some((v) => v[preferred]);
      if (hasContent) return preferred;
    }
    // Use any available language
    for (const values of Object.values(fields)) {
      const firstLang = Object.keys(values)[0];
      if (firstLang) return firstLang;
    }
    return null;
  }

  private buildPrompt(
    fields: Record<string, Record<string, string>>,
    missing: Record<string, string[]>,
    sourceLang: string,
  ): string {
    const lines: string[] = [
      "Translate the following Busan tourism content fields.",
      `Source language: ${sourceLang}`,
      "",
      "Current content:",
    ];

    for (const [field, values] of Object.entries(fields)) {
      lines.push(`  "${field}":`);
      for (const [lang, text] of Object.entries(values)) {
        lines.push(`    ${lang}: "${text}"`);
      }
    }

    lines.push("");
    lines.push("Translate ONLY the missing languages for each field:");

    for (const [field, locales] of Object.entries(missing)) {
      lines.push(`  "${field}": [${locales.join(", ")}]`);
    }

    lines.push("");
    lines.push("Return JSON with this exact structure:");
    lines.push("{");
    for (const [field, locales] of Object.entries(missing)) {
      lines.push(`  "${field}": { ${locales.map((l) => `"${l}": "translated text"`).join(", ")} },`);
    }
    lines.push("}");

    return lines.join("\n");
  }
}
