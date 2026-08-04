import { describe, it, expect, vi, beforeEach } from "vitest";
import { getEnv, clearEnvCache } from "./env";

describe("env", () => {
  beforeEach(() => {
    clearEnvCache();
  });

  it("should throw if DATABASE_URL is missing", async () => {
    vi.stubEnv("DATABASE_URL", "");
    // Dynamic import to re-evaluate
    await expect(async () => {
      const mod = await import("./env");
      mod.getEnv();
    }).rejects.toThrow();
    vi.unstubAllEnvs();
  });

  it("includes SP3 API key fields with empty defaults", () => {
    vi.stubEnv("DATABASE_URL", "test");
    vi.stubEnv("GROQ_API_KEY", "test");
    const env = getEnv();
    expect(env.GOOGLE_MAPS_API_KEY).toBe("");
    expect(env.NAVER_CLIENT_ID).toBe("");
    expect(env.NAVER_CLIENT_SECRET).toBe("");
    expect(env.TAGO_API_KEY).toBe("");
    expect(env.TOUR_API_KEY).toBe("");
    expect(env.GOOGLE_PLACES_API_KEY).toBe("");
    vi.unstubAllEnvs();
  });
});
