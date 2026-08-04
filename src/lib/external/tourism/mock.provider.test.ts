import { describe, it, expect } from "vitest";
import { MockTourismProvider } from "./mock.provider";

describe("MockTourismProvider", () => {
  const provider = new MockTourismProvider();

  it("returns spots matching query", async () => {
    const spots = await provider.searchSpots("beach");
    expect(spots.length).toBeGreaterThan(0);
    const hasBeach = spots.some(
      (s) => s.names.en?.toLowerCase().includes("beach") || s.category === "beach",
    );
    expect(hasBeach).toBe(true);
  });

  it("returns all spots for empty query", async () => {
    const spots = await provider.searchSpots("");
    expect(spots.length).toBe(5);
  });

  it("respects limit option", async () => {
    const spots = await provider.searchSpots("", { limit: 2 });
    expect(spots.length).toBe(2);
  });

  it("getSpotDetail returns a spot by externalId", async () => {
    const spots = await provider.searchSpots("");
    const detail = await provider.getSpotDetail(spots[0]!.externalId);
    expect(detail).not.toBeNull();
    expect(detail!.externalId).toBe(spots[0]!.externalId);
  });

  it("getSpotDetail returns null for unknown id", async () => {
    const detail = await provider.getSpotDetail("nonexistent");
    expect(detail).toBeNull();
  });
});
