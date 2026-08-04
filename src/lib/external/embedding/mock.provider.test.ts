import { describe, it, expect } from "vitest";
import { MockEmbeddingProvider } from "./mock.provider";

describe("MockEmbeddingProvider", () => {
  const provider = new MockEmbeddingProvider();

  it("returns zero vectors for input texts", async () => {
    const result = await provider.embed(["hello", "world"]);
    expect(result.length).toBe(2);
    expect(result[0]!.length).toBe(provider.dimensions);
    expect(result[0]!.every((v) => v === 0)).toBe(true);
  });

  it("has dimensions property set to 1024", () => {
    expect(provider.dimensions).toBe(1024);
  });

  it("handles empty input", async () => {
    const result = await provider.embed([]);
    expect(result).toEqual([]);
  });
});
