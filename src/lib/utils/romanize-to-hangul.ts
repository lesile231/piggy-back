/**
 * §4.1 Stage 3 — Romanization reverse-conversion.
 *
 * Converts romanized Korean text back to Hangul candidates.
 * Supports Revised Romanization (RR), McCune-Reischauer (MR),
 * and common informal/phonetic spellings.
 *
 * Korean syllables are composed of:
 * - 초성 (initial consonant): ㄱ ㄲ ㄴ ㄷ ㄸ ㄹ ㅁ ㅂ ㅃ ㅅ ㅆ ㅇ ㅈ ㅉ ㅊ ㅋ ㅌ ㅍ ㅎ (19)
 * - 중성 (medial vowel): ㅏ ㅐ ㅑ ㅒ ㅓ ㅔ ㅕ ㅖ ㅗ ㅘ ㅙ ㅚ ㅛ ㅜ ㅝ ㅞ ㅟ ㅠ ㅡ ㅢ ㅣ (21)
 * - 종성 (final consonant, optional): (none) ㄱ ㄲ ㄳ ㄴ ㄵ ㄶ ㄷ ㄹ ㄺ ㄻ ㄼ ㄽ ㄾ ㄿ ㅀ ㅁ ㅂ ㅄ ㅅ ㅆ ㅇ ㅈ ㅊ ㅋ ㅌ ㅍ ㅎ (28, including none)
 */

// Unicode Hangul composition constants
const HANGUL_BASE = 0xac00;
const CHO_COUNT = 19;
const JUNG_COUNT = 21;
const JONG_COUNT = 28;

// 초성 (initial consonants) in Unicode order
const CHO_LIST = [
  "ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ",
  "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ",
];

// 중성 (medial vowels) in Unicode order
const JUNG_LIST = [
  "ㅏ", "ㅐ", "ㅑ", "ㅒ", "ㅓ", "ㅔ", "ㅕ", "ㅖ", "ㅗ",
  "ㅘ", "ㅙ", "ㅚ", "ㅛ", "ㅜ", "ㅝ", "ㅞ", "ㅟ", "ㅠ",
  "ㅡ", "ㅢ", "ㅣ",
];

// 종성 (final consonants) in Unicode order (index 0 = no final)
const JONG_LIST = [
  "", "ㄱ", "ㄲ", "ㄳ", "ㄴ", "ㄵ", "ㄶ", "ㄷ", "ㄹ",
  "ㄺ", "ㄻ", "ㄼ", "ㄽ", "ㄾ", "ㄿ", "ㅀ", "ㅁ", "ㅂ",
  "ㅄ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ",
];

/**
 * Compose Hangul syllable from jamo indices.
 */
function composeHangul(cho: number, jung: number, jong: number): string {
  return String.fromCharCode(
    HANGUL_BASE + cho * JUNG_COUNT * JONG_COUNT + jung * JONG_COUNT + jong,
  );
}

// ── Romanization-to-jamo mapping tables ──

// Vowel mappings: romanized → 중성 index
// Ordered longest-first for greedy matching
const VOWEL_MAP: [string, number][] = [
  // Compound vowels (must come first)
  ["wae", 10], // ㅙ
  ["wai", 10], // ㅙ (informal)
  ["woe", 10], // ㅙ (MR variant)
  ["weo", 14], // ㅝ
  ["we", 15],  // ㅞ
  ["wi", 16],  // ㅟ
  ["wa", 9],   // ㅘ
  ["wo", 14],  // ㅝ
  ["oe", 11],  // ㅚ
  ["ui", 19],  // ㅢ
  // Simple vowels
  ["yae", 3],  // ㅒ
  ["yai", 3],  // ㅒ (informal)
  ["ya", 2],   // ㅑ
  ["ye", 7],   // ㅖ
  ["yeo", 6],  // ㅕ
  ["yo", 12],  // ㅛ
  ["yu", 17],  // ㅠ
  ["ae", 1],   // ㅐ
  ["ai", 1],   // ㅐ (informal: sounds like "ai")
  ["eo", 4],   // ㅓ (RR)
  ["eu", 18],  // ㅡ (RR)
  ["ee", 20],  // ㅣ (informal)
  ["oo", 13],  // ㅜ (informal: "oo" sound)
  ["a", 0],    // ㅏ
  ["e", 5],    // ㅔ
  ["i", 20],   // ㅣ
  ["o", 8],    // ㅗ
  ["u", 13],   // ㅜ
];

// Consonant mappings: romanized → 초성 index
// Used for initial consonant position
const CHO_MAP: [string, number][] = [
  // Multi-char consonants first
  ["kk", 1],   // ㄲ
  ["tt", 4],   // ㄸ
  ["pp", 8],   // ㅃ
  ["ss", 10],  // ㅆ
  ["jj", 13],  // ㅉ
  ["ch", 14],  // ㅊ
  ["tch", 14], // ㅊ (MR)
  ["ts", 14],  // ㅊ (informal)
  ["sh", 9],   // ㅅ (actually ㅅ, not ㅆ — "sh" is a common romanization of ㅅ before ㅣ)
  ["ng", 11],  // ㅇ (as initial, rare but possible in names)
  // Single consonants
  ["g", 0],    // ㄱ (RR)
  ["k", 15],   // ㅋ (also ㄱ in MR — handled by producing multiple candidates)
  ["n", 2],    // ㄴ
  ["d", 3],    // ㄷ (RR)
  ["t", 16],   // ㅌ (also ㄷ in MR)
  ["r", 5],    // ㄹ
  ["l", 5],    // ㄹ
  ["m", 6],    // ㅁ
  ["b", 7],    // ㅂ (RR)
  ["p", 17],   // ㅍ (also ㅂ in MR)
  ["s", 9],    // ㅅ
  ["j", 12],   // ㅈ (RR)
  ["h", 18],   // ㅎ
];

// Final consonant (종성) mappings
const JONG_MAP: [string, number][] = [
  ["ng", 21],  // ㅇ (받침)
  ["kk", 2],   // ㄲ
  ["ss", 20],  // ㅆ
  ["lk", 9],   // ㄺ
  ["lm", 10],  // ㄻ
  ["lp", 11],  // ㄼ
  ["lt", 13],  // ㄾ
  ["lh", 15],  // ㅀ
  ["nj", 5],   // ㄵ
  ["nh", 6],   // ㄶ
  ["k", 1],    // ㄱ
  ["g", 1],    // ㄱ (RR)
  ["n", 4],    // ㄴ
  ["t", 7],    // ㄷ
  ["d", 7],    // ㄷ (RR)
  ["l", 8],    // ㄹ
  ["r", 8],    // ㄹ
  ["m", 16],   // ㅁ
  ["p", 17],   // ㅂ
  ["b", 17],   // ㅂ (RR)
  ["s", 19],   // ㅅ
  ["j", 22],   // ㅈ
];

/**
 * Check if a character starts a vowel pattern.
 */
function isVowelStart(ch: string): boolean {
  return "aeiouyuw".includes(ch);
}

/**
 * Try to match a vowel pattern at position in the input.
 * Returns [jungIndex, charsConsumed] or null.
 */
function matchVowel(input: string, pos: number): [number, number] | null {
  for (const [pattern, jungIdx] of VOWEL_MAP) {
    if (input.startsWith(pattern, pos)) {
      return [jungIdx, pattern.length];
    }
  }
  return null;
}

/**
 * Try to match an initial consonant at position.
 * Returns [choIndex, charsConsumed] or null.
 */
function matchCho(input: string, pos: number): [number, number] | null {
  for (const [pattern, choIdx] of CHO_MAP) {
    if (input.startsWith(pattern, pos)) {
      return [choIdx, pattern.length];
    }
  }
  return null;
}

/**
 * Try to match a final consonant at position.
 * Only consumes if the NEXT character is NOT a vowel start (otherwise the
 * consonant belongs to the next syllable as 초성).
 * Returns [jongIndex, charsConsumed] or null.
 */
function matchJong(
  input: string,
  pos: number,
): [number, number] | null {
  for (const [pattern, jongIdx] of JONG_MAP) {
    if (input.startsWith(pattern, pos)) {
      const afterPos = pos + pattern.length;
      // "ng" is always 종성 (ㅇ받침) — it's a digraph representing a single
      // jamo that has no 초성 role. The next syllable gets silent ㅇ.
      if (pattern === "ng") {
        return [jongIdx, pattern.length];
      }
      // For single consonants: if the next char starts a vowel, this consonant
      // belongs to the next syllable as 초성, not as 종성
      if (afterPos < input.length && isVowelStart(input[afterPos]!)) {
        continue;
      }
      return [jongIdx, pattern.length];
    }
  }
  return null;
}

/**
 * Convert a romanized Korean string to Hangul.
 *
 * Strategy: greedy syllable-by-syllable parsing.
 * 1. Try to match 초성 (initial consonant)
 * 2. Match 중성 (vowel) — required
 * 3. Optionally match 종성 (final consonant)
 * 4. Compose syllable and repeat
 *
 * If a vowel is encountered without a preceding consonant,
 * use ㅇ (silent initial) as the 초성.
 */
export function romanizeToHangul(input: string): string {
  const s = input.toLowerCase().replace(/[\s\-''.·_]/g, "");
  if (!s) return "";

  let pos = 0;
  let result = "";

  while (pos < s.length) {
    // Try to parse a full syllable

    // Step 1: Initial consonant (초성)
    let cho = 11; // default ㅇ (silent)
    let consumed = 0;

    const choMatch = matchCho(s, pos);
    if (choMatch) {
      // Only use as 초성 if followed by a vowel
      const afterCho = pos + choMatch[1];
      if (afterCho < s.length && matchVowel(s, afterCho)) {
        cho = choMatch[0];
        consumed = choMatch[1];
      }
    }

    // Step 2: Vowel (중성) — required
    const vowelMatch = matchVowel(s, pos + consumed);
    if (!vowelMatch) {
      // No vowel found — skip this character
      pos++;
      continue;
    }

    const [jung, vowelLen] = vowelMatch;
    consumed += vowelLen;

    // Step 3: Final consonant (종성) — optional
    let jong = 0; // no final consonant
    const jongMatch = matchJong(s, pos + consumed);
    if (jongMatch) {
      jong = jongMatch[0];
      consumed += jongMatch[1];
    }

    result += composeHangul(cho, jung, jong);
    pos += consumed;
  }

  return result;
}

// Re-export jamo lists for Stage 4 usage
export { CHO_LIST, JUNG_LIST, JONG_LIST, JUNG_COUNT, JONG_COUNT, HANGUL_BASE };
