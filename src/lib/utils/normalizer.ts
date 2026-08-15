/**
 * Query normalizer for alias dictionary matching (§4.1 Stage 1).
 *
 * Operations in order:
 * 1. Unicode NFD decomposition + strip combining diacritical marks
 * 2. Fullwidth ASCII → halfwidth (U+FF01–U+FF5E → U+0021–U+007E)
 * 3. Lowercase
 * 4. Strip whitespace, hyphens, apostrophes, periods, middle dots, underscores
 *
 * CJK characters pass through unchanged.
 * Example: "Hae-un-dae" → "haeundae"
 */
export function normalize(input: string): string {
  return (
    input
      // 1. NFD decomposition + strip combining diacritical marks (U+0300–U+036F)
      //    Then NFC recomposition to restore Hangul Jamo → syllable blocks
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .normalize("NFC")
      // 2. Fullwidth ASCII → halfwidth
      .replace(/[\uff01-\uff5e]/g, (ch) =>
        String.fromCharCode(ch.charCodeAt(0) - 0xfee0),
      )
      // 3. Lowercase
      .toLowerCase()
      // 4. Strip separators: whitespace, hyphens, apostrophes, periods, middle dots, underscores
      .replace(/[\s\-''.·_]/g, "")
  );
}
