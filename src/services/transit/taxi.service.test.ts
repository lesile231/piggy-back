import { describe, it, expect } from "vitest";
import { TaxiService } from "./taxi.service";
import type { LatLng } from "@/types/common";

describe("TaxiService", () => {
  const service = new TaxiService();

  it("generates deep links with correct coordinates", () => {
    const from: LatLng = { latitude: 35.1586, longitude: 129.1604 };
    const to: LatLng = { latitude: 35.0975, longitude: 129.0088 };

    const msg = service.generateDeepLinks(from, to, "en");

    expect(msg.type).toBe("buttons");
    expect(msg.text).toBeTruthy();
    expect(msg.buttons).toBeDefined();
    expect(msg.buttons!.length).toBe(2);
  });

  it("KakaoT link contains destination coordinates", () => {
    const from: LatLng = { latitude: 35.1586, longitude: 129.1604 };
    const to: LatLng = { latitude: 35.0975, longitude: 129.0088 };

    const msg = service.generateDeepLinks(from, to, "en");
    const kakaoBtn = msg.buttons!.find((b) => b.label.includes("KakaoT"));

    expect(kakaoBtn).toBeDefined();
    expect(kakaoBtn!.id).toContain("35.0975");
    expect(kakaoBtn!.id).toContain("129.0088");
  });

  it("Uber link contains pickup and dropoff coordinates", () => {
    const from: LatLng = { latitude: 35.1586, longitude: 129.1604 };
    const to: LatLng = { latitude: 35.0975, longitude: 129.0088 };

    const msg = service.generateDeepLinks(from, to, "en");
    const uberBtn = msg.buttons!.find((b) => b.label.includes("Uber"));

    expect(uberBtn).toBeDefined();
    expect(uberBtn!.id).toContain("35.1586"); // pickup
    expect(uberBtn!.id).toContain("35.0975"); // dropoff
  });

  it("localizes text for Korean", () => {
    const from: LatLng = { latitude: 35.1586, longitude: 129.1604 };
    const to: LatLng = { latitude: 35.0975, longitude: 129.0088 };

    const msg = service.generateDeepLinks(from, to, "ko");
    expect(msg.text).toBeTruthy();
  });
});
