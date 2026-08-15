import { describe, it, expect } from "vitest";
import {
  DECODE_CHARS_BY_SCRIPT,
  DECODE_CYCLE_ORDER,
  TIMING,
  buildCycleSequence,
} from "./constants";

describe("constants", () => {
  it("has four script character sets", () => {
    expect(Object.keys(DECODE_CHARS_BY_SCRIPT)).toEqual([
      "latin",
      "katakana",
      "cjk",
      "hangul",
    ]);
  });

  it("each script set has at least 10 characters", () => {
    for (const [script, chars] of Object.entries(DECODE_CHARS_BY_SCRIPT)) {
      expect(chars.length, `${script} should have ≥10 chars`).toBeGreaterThanOrEqual(10);
    }
  });

  it("has no duplicate characters within a script set", () => {
    for (const [script, chars] of Object.entries(DECODE_CHARS_BY_SCRIPT)) {
      const unique = new Set(chars);
      expect(unique.size, `${script} has duplicates`).toBe(chars.length);
    }
  });

  it("cycle order includes all four scripts", () => {
    expect(DECODE_CYCLE_ORDER).toEqual(["latin", "katakana", "cjk", "hangul"]);
  });

  it("buildCycleSequence returns flat array in script order", () => {
    const seq = buildCycleSequence();
    // First chars should be latin, then katakana, then cjk, then hangul
    expect(seq[0]).toBe(DECODE_CHARS_BY_SCRIPT.latin[0]);
    const latinLen = DECODE_CHARS_BY_SCRIPT.latin.length;
    expect(seq[latinLen]).toBe(DECODE_CHARS_BY_SCRIPT.katakana[0]);
    // Total length = sum of all script lengths
    const totalLen = Object.values(DECODE_CHARS_BY_SCRIPT).reduce(
      (sum, arr) => sum + arr.length,
      0,
    );
    expect(seq).toHaveLength(totalLen);
  });

  it("TIMING has required numeric fields", () => {
    expect(TIMING.MIN_DECODE_MS).toBeGreaterThanOrEqual(1000);
    expect(TIMING.FLIP_INTERVAL_FAST_MS).toBeLessThan(TIMING.FLIP_INTERVAL_SLOW_MS);
    expect(TIMING.SLOT_STAGGER_MS).toBeGreaterThan(0);
    expect(TIMING.EXPAND_DURATION_MS).toBeGreaterThan(0);
    expect(TIMING.LOCK_SCALE_DURATION_MS).toBeGreaterThan(0);
    expect(TIMING.RESULT_DELAY_MS).toBeGreaterThan(0);
    expect(TIMING.RESULT_FADE_MS).toBeGreaterThan(0);
    expect(TIMING.MAX_WAIT_MS).toBeGreaterThan(TIMING.MIN_DECODE_MS);
  });
});
