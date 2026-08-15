import { describe, it, expect } from "vitest";
import { determineAction } from "./resolve-action";
import type { ResolutionMatch } from "@/types/ai";

function match(confidence: number, placeId = "spot-1"): ResolutionMatch {
  return {
    placeId,
    nameKo: "테스트",
    nameLocalized: "Test",
    romanized: "test",
    confidence,
  };
}

describe("determineAction", () => {
  it('returns "empty" when no matches', () => {
    expect(determineAction([])).toBe("empty");
  });

  it('returns "navigate" for single match with confidence ≥ 0.9', () => {
    expect(determineAction([match(0.9)])).toBe("navigate");
    expect(determineAction([match(1.0)])).toBe("navigate");
    expect(determineAction([match(0.95)])).toBe("navigate");
  });

  it('returns "confirm" for multiple matches even with confidence ≥ 0.9', () => {
    expect(determineAction([match(0.95, "a"), match(0.92, "b")])).toBe("confirm");
  });

  it('returns "confirm" for confidence ≥ 0.6 and < 0.9', () => {
    expect(determineAction([match(0.6)])).toBe("confirm");
    expect(determineAction([match(0.75)])).toBe("confirm");
    expect(determineAction([match(0.89)])).toBe("confirm");
  });

  it('returns "disambiguate" for confidence < 0.6', () => {
    expect(determineAction([match(0.5)])).toBe("disambiguate");
    expect(determineAction([match(0.3)])).toBe("disambiguate");
    expect(determineAction([match(0.1)])).toBe("disambiguate");
  });

  it('returns "disambiguate" for multiple low-confidence matches', () => {
    expect(
      determineAction([match(0.4, "a"), match(0.3, "b"), match(0.2, "c")]),
    ).toBe("disambiguate");
  });

  it("uses only the top match confidence for thresholding", () => {
    // Top is 0.7 (≥ 0.6) → confirm, regardless of second match
    expect(determineAction([match(0.7, "a"), match(0.3, "b")])).toBe("confirm");
  });
});
