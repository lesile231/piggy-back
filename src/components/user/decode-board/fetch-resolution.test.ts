import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchResolution } from "./fetch-resolution";
import type { Resolution } from "@/types/ai";

const MOCK_RESOLUTION: Resolution = {
  query: "haeundae",
  normalizedQuery: "haeundae",
  detectedLang: "en",
  stage: 2,
  action: "navigate",
  matches: [
    {
      placeId: "spot-1",
      nameKo: "해운대해수욕장",
      nameLocalized: "Haeundae Beach",
      romanized: "Haeundae",
      confidence: 0.95,
    },
  ],
};

describe("fetchResolution", () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_RESOLUTION),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls /api/resolve with query and lang params", async () => {
    await fetchResolution("haeundae", "en");
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/resolve?q=haeundae&lang=en",
      expect.objectContaining({ signal: undefined }),
    );
  });

  it("returns the Resolution object on success", async () => {
    const result = await fetchResolution("haeundae", "en");
    expect(result).toEqual(MOCK_RESOLUTION);
  });

  it("throws on non-ok response", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });
    await expect(fetchResolution("bad", "en")).rejects.toThrow("Resolution failed");
  });

  it("forwards AbortSignal to fetch", async () => {
    const controller = new AbortController();
    await fetchResolution("test", "en", controller.signal);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ signal: controller.signal }),
    );
  });

  it("encodes query with special characters", async () => {
    await fetchResolution("海雲台", "zh");
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("q=%E6%B5%B7%E9%9B%B2%E5%8F%B0"),
      expect.anything(),
    );
  });
});
