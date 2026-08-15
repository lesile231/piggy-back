import { describe, it, expect } from "vitest";
import {
  decomposeSyllable,
  toJamo,
  jamoDistance,
  jamoSimilarity,
  findClosestByJamo,
} from "./jamo-match";

describe("decomposeSyllable", () => {
  it("decomposes 가 (ㄱ+ㅏ, no final)", () => {
    expect(decomposeSyllable("가")).toEqual(["ㄱ", "ㅏ"]);
  });

  it("decomposes 한 (ㅎ+ㅏ+ㄴ)", () => {
    expect(decomposeSyllable("한")).toEqual(["ㅎ", "ㅏ", "ㄴ"]);
  });

  it("decomposes 읽 (ㅇ+ㅣ+ㄺ)", () => {
    expect(decomposeSyllable("읽")).toEqual(["ㅇ", "ㅣ", "ㄺ"]);
  });

  it("passes through non-Hangul characters", () => {
    expect(decomposeSyllable("A")).toEqual(["A"]);
    expect(decomposeSyllable("1")).toEqual(["1"]);
  });
});

describe("toJamo", () => {
  it("decomposes 해운대", () => {
    expect(toJamo("해운대")).toEqual([
      "ㅎ", "ㅐ",       // 해
      "ㅇ", "ㅜ", "ㄴ", // 운
      "ㄷ", "ㅐ",       // 대
    ]);
  });

  it("decomposes 감천", () => {
    expect(toJamo("감천")).toEqual([
      "ㄱ", "ㅏ", "ㅁ", // 감
      "ㅊ", "ㅓ", "ㄴ", // 천
    ]);
  });

  it("handles empty string", () => {
    expect(toJamo("")).toEqual([]);
  });
});

describe("jamoDistance", () => {
  it("returns 0 for identical sequences", () => {
    const jamo = toJamo("감천");
    expect(jamoDistance(jamo, jamo)).toBe(0);
  });

  it("computes distance between similar names", () => {
    // 버머사 vs 범어사: different jamo decompositions
    // 버머사: ㅂㅓ / ㅁㅓ / ㅅㅏ = [ㅂ,ㅓ,ㅁ,ㅓ,ㅅ,ㅏ]
    // 범어사: ㅂㅓㅁ / ㅇㅓ / ㅅㅏ = [ㅂ,ㅓ,ㅁ,ㅇ,ㅓ,ㅅ,ㅏ]
    const a = toJamo("버머사");
    const b = toJamo("범어사");
    const dist = jamoDistance(a, b);
    // Distance should be small (just a few jamo differences)
    expect(dist).toBeLessThanOrEqual(3);
    expect(dist).toBeGreaterThan(0);
  });

  it("computes large distance for completely different names", () => {
    const a = toJamo("해운대");
    const b = toJamo("감천");
    const dist = jamoDistance(a, b);
    expect(dist).toBeGreaterThan(3);
  });
});

describe("jamoSimilarity", () => {
  it("returns 1 for identical strings", () => {
    expect(jamoSimilarity("해운대", "해운대")).toBe(1);
  });

  it("returns high similarity for near-matches", () => {
    // 버머사 vs 범어사 should be quite similar at jamo level
    const sim = jamoSimilarity("버머사", "범어사");
    expect(sim).toBeGreaterThan(0.5);
  });

  it("returns low similarity for different names", () => {
    const sim = jamoSimilarity("해운대", "감천");
    expect(sim).toBeLessThan(0.5);
  });
});

describe("findClosestByJamo", () => {
  const spots = [
    { id: "1", nameKo: "해운대" },
    { id: "2", nameKo: "감천문화마을" },
    { id: "3", nameKo: "자갈치시장" },
    { id: "4", nameKo: "광안리해수욕장" },
    { id: "5", nameKo: "범어사" },
    { id: "6", nameKo: "태종대" },
    { id: "7", nameKo: "용두산공원" },
    { id: "8", nameKo: "송정해수욕장" },
  ];

  it("finds exact match with similarity 1.0", () => {
    const results = findClosestByJamo("해운대", spots);
    expect(results[0]?.nameKo).toBe("해운대");
    expect(results[0]?.similarity).toBe(1);
  });

  it("finds 범어사 from Stage 3 output 버머사", () => {
    const results = findClosestByJamo("버머사", spots);
    // 범어사 should be in results with high similarity
    const beomeosa = results.find((r) => r.nameKo === "범어사");
    expect(beomeosa).toBeDefined();
    expect(beomeosa!.similarity).toBeGreaterThan(0.5);
  });

  it("returns empty for completely unrelated query", () => {
    const results = findClosestByJamo("ㅋㅋㅋ", spots, 0.5);
    expect(results.length).toBe(0);
  });

  it("respects limit parameter", () => {
    const results = findClosestByJamo("해운대", spots, 0.1, 2);
    expect(results.length).toBeLessThanOrEqual(2);
  });

  it("respects threshold parameter", () => {
    const results = findClosestByJamo("해운대", spots, 0.99);
    // Only exact match should pass a very high threshold
    expect(results.length).toBe(1);
    expect(results[0]?.nameKo).toBe("해운대");
  });
});
