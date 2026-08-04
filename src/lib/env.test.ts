import { describe, it, expect, vi } from "vitest";

describe("env", () => {
  it("should throw if DATABASE_URL is missing", async () => {
    vi.stubEnv("DATABASE_URL", "");
    // Dynamic import to re-evaluate
    await expect(async () => {
      const mod = await import("./env");
      mod.getEnv();
    }).rejects.toThrow();
    vi.unstubAllEnvs();
  });
});
