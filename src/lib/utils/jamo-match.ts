/**
 * §4.1 Stage 4 — Phonetic approximate matching.
 *
 * Decomposes Hangul into jamo sequences and computes Levenshtein distance
 * to find the closest match among known place names.
 */

import {
  CHO_LIST,
  JUNG_LIST,
  JONG_LIST,
  JUNG_COUNT,
  JONG_COUNT,
  HANGUL_BASE,
} from "./romanize-to-hangul";

/**
 * Decompose a single Hangul syllable into its jamo components.
 * Returns an array of 2-3 jamo strings (cho, jung, [jong]).
 * Non-Hangul characters are returned as-is in a single-element array.
 */
export function decomposeSyllable(char: string): string[] {
  const code = char.charCodeAt(0);

  // Only decompose Hangul syllables (가-힣)
  if (code < HANGUL_BASE || code > 0xd7a3) {
    return [char];
  }

  const offset = code - HANGUL_BASE;
  const choIdx = Math.floor(offset / (JUNG_COUNT * JONG_COUNT));
  const jungIdx = Math.floor((offset % (JUNG_COUNT * JONG_COUNT)) / JONG_COUNT);
  const jongIdx = offset % JONG_COUNT;

  const result = [CHO_LIST[choIdx]!, JUNG_LIST[jungIdx]!];
  if (jongIdx > 0) {
    result.push(JONG_LIST[jongIdx]!);
  }
  return result;
}

/**
 * Decompose an entire string into a flat jamo sequence.
 * e.g. "해운대" → ["ㅎ","ㅐ","ㅇ","ㅜ","ㄴ","ㄷ","ㅐ"]
 */
export function toJamo(text: string): string[] {
  const result: string[] = [];
  for (const char of text) {
    result.push(...decomposeSyllable(char));
  }
  return result;
}

/**
 * Levenshtein distance on jamo sequences.
 * Operates on string arrays where each element is a single jamo.
 */
export function jamoDistance(a: string[], b: string[]): number {
  const m = a.length;
  const n = b.length;

  // Use single-row optimization for memory efficiency
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  let curr = new Array<number>(n + 1);

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j]! + 1,      // deletion
        curr[j - 1]! + 1,  // insertion
        prev[j - 1]! + cost, // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }

  return prev[n]!;
}

/**
 * Normalized jamo similarity: 1 - (distance / maxLen).
 * Returns a value between 0 and 1, where 1 is an exact match.
 */
export function jamoSimilarity(a: string, b: string): number {
  const jamoA = toJamo(a);
  const jamoB = toJamo(b);
  const maxLen = Math.max(jamoA.length, jamoB.length);
  if (maxLen === 0) return 1;
  const dist = jamoDistance(jamoA, jamoB);
  return 1 - dist / maxLen;
}

export interface JamoCandidate {
  id: string;
  nameKo: string;
  similarity: number;
}

/**
 * Find the closest matches from a list of spot names using jamo distance.
 * Returns candidates sorted by similarity (highest first), filtered by threshold.
 *
 * @param hangulQuery - The Hangul text to match (output from Stage 3)
 * @param spots - Known spots with id and nameKo
 * @param threshold - Minimum similarity to include (0-1, default 0.5)
 * @param limit - Max number of results to return
 */
export function findClosestByJamo(
  hangulQuery: string,
  spots: { id: string; nameKo: string }[],
  threshold = 0.5,
  limit = 3,
): JamoCandidate[] {
  const queryJamo = toJamo(hangulQuery);
  if (queryJamo.length === 0) return [];

  const candidates: JamoCandidate[] = [];

  for (const spot of spots) {
    const spotJamo = toJamo(spot.nameKo);
    const maxLen = Math.max(queryJamo.length, spotJamo.length);
    if (maxLen === 0) continue;

    const dist = jamoDistance(queryJamo, spotJamo);
    const similarity = 1 - dist / maxLen;

    if (similarity >= threshold) {
      candidates.push({
        id: spot.id,
        nameKo: spot.nameKo,
        similarity,
      });
    }
  }

  // Sort by similarity descending, then by name for stability
  candidates.sort((a, b) => b.similarity - a.similarity || a.nameKo.localeCompare(b.nameKo));

  return candidates.slice(0, limit);
}
