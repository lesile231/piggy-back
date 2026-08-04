import { describe, it, expect } from "vitest";
import { MockRealtimeProvider } from "./mock.provider";

describe("MockRealtimeProvider", () => {
  const provider = new MockRealtimeProvider();

  it("returns arrivals for any stop ID", async () => {
    const arrivals = await provider.getArrivals("stop-1");
    expect(arrivals.length).toBeGreaterThan(0);
    expect(arrivals[0]!.line).toBeTruthy();
    expect(arrivals[0]!.arrivalMinutes).toBeGreaterThanOrEqual(0);
  });

  it("each arrival has required fields", async () => {
    const arrivals = await provider.getArrivals("stop-1");
    for (const arrival of arrivals) {
      expect(arrival.line).toBeTruthy();
      expect(arrival.destination).toBeTruthy();
      expect(typeof arrival.arrivalMinutes).toBe("number");
    }
  });
});
