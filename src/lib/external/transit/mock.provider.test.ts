import { describe, it, expect } from "vitest";
import { MockTransitProvider } from "./mock.provider";
import type { LatLng } from "@/types/common";

describe("MockTransitProvider", () => {
  const provider = new MockTransitProvider();

  it("returns routes for any coordinate pair", async () => {
    const from: LatLng = { latitude: 35.1586, longitude: 129.1604 };
    const to: LatLng = { latitude: 35.0975, longitude: 129.0088 };
    const routes = await provider.searchRoutes(from, to);

    expect(routes.length).toBeGreaterThan(0);
    expect(routes[0]!.summary).toBeTruthy();
    expect(routes[0]!.duration).toBeGreaterThan(0);
    expect(routes[0]!.steps.length).toBeGreaterThan(0);
    expect(routes[0]!.fare).toBeGreaterThan(0);
  });

  it("each step has required fields", async () => {
    const from: LatLng = { latitude: 35.1586, longitude: 129.1604 };
    const to: LatLng = { latitude: 35.0975, longitude: 129.0088 };
    const routes = await provider.searchRoutes(from, to);
    const step = routes[0]!.steps[0]!;

    expect(["walk", "bus", "metro", "train"]).toContain(step.mode);
    expect(step.instruction.en).toBeTruthy();
    expect(step.instruction.ko).toBeTruthy();
    expect(step.duration).toBeGreaterThan(0);
  });
});
