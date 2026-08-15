// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDecodeAnimation } from "./use-decode-animation";
import * as fetchMod from "./fetch-resolution";
import { TIMING } from "./constants";
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
      nameKo: "해운대",
      nameLocalized: "Haeundae Beach",
      romanized: "Haeundae",
      confidence: 0.95,
    },
  ],
};

describe("useDecodeAnimation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(fetchMod, "fetchResolution").mockResolvedValue(MOCK_RESOLUTION);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("starts in idle phase with null resolution", () => {
    const { result } = renderHook(() =>
      useDecodeAnimation({ lang: "en" }),
    );
    expect(result.current.phase).toBe("idle");
    expect(result.current.resolution).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.targetChars).toEqual([]);
  });

  it("transitions to expanding when start() is called", () => {
    const { result } = renderHook(() =>
      useDecodeAnimation({ lang: "en" }),
    );

    act(() => {
      result.current.start("haeundae");
    });

    expect(result.current.phase).toBe("expanding");
  });

  it("transitions expanding → decoding after EXPAND_DURATION_MS", async () => {
    const { result } = renderHook(() =>
      useDecodeAnimation({ lang: "en" }),
    );

    act(() => {
      result.current.start("haeundae");
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(TIMING.EXPAND_DURATION_MS + 10);
    });

    expect(result.current.phase).toBe("decoding");
  });

  it("transitions decoding → resolved after API + min time both complete", async () => {
    const { result } = renderHook(() =>
      useDecodeAnimation({ lang: "en" }),
    );

    act(() => {
      result.current.start("haeundae");
    });

    // Advance past expand + min decode time
    await act(async () => {
      await vi.advanceTimersByTimeAsync(
        TIMING.EXPAND_DURATION_MS + TIMING.MIN_DECODE_MS + 100,
      );
    });

    expect(result.current.phase).toBe("resolved");
    expect(result.current.resolution).toEqual(MOCK_RESOLUTION);
    expect(result.current.targetChars).toEqual(["해", "운", "대"]);
  });

  it("waits for API even if min time has passed", async () => {
    // Make API slow
    let resolveApi: (r: Resolution) => void;
    vi.spyOn(fetchMod, "fetchResolution").mockImplementation(
      () => new Promise((r) => { resolveApi = r; }),
    );

    const { result } = renderHook(() =>
      useDecodeAnimation({ lang: "en" }),
    );

    act(() => {
      result.current.start("haeundae");
    });

    // Advance past expand + min decode time
    await act(async () => {
      await vi.advanceTimersByTimeAsync(
        TIMING.EXPAND_DURATION_MS + TIMING.MIN_DECODE_MS + 100,
      );
    });

    // Still decoding because API hasn't responded
    expect(result.current.phase).toBe("decoding");

    // Now resolve the API
    await act(async () => {
      resolveApi!(MOCK_RESOLUTION);
      await vi.advanceTimersByTimeAsync(10);
    });

    expect(result.current.phase).toBe("resolved");
  });

  it("sets error on API failure", async () => {
    vi.spyOn(fetchMod, "fetchResolution").mockRejectedValue(
      new Error("Network error"),
    );

    const { result } = renderHook(() =>
      useDecodeAnimation({ lang: "en" }),
    );

    act(() => {
      result.current.start("haeundae");
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(
        TIMING.EXPAND_DURATION_MS + TIMING.MIN_DECODE_MS + 100,
      );
    });

    expect(result.current.phase).toBe("resolved");
    expect(result.current.error).toBe("Network error");
    expect(result.current.resolution).toBeNull();
  });

  it("times out after MAX_WAIT_MS", async () => {
    // API never resolves
    vi.spyOn(fetchMod, "fetchResolution").mockImplementation(
      () => new Promise(() => {}),
    );

    const { result } = renderHook(() =>
      useDecodeAnimation({ lang: "en" }),
    );

    act(() => {
      result.current.start("haeundae");
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(
        TIMING.EXPAND_DURATION_MS + TIMING.MAX_WAIT_MS + 100,
      );
    });

    expect(result.current.phase).toBe("resolved");
    expect(result.current.error).toBeTruthy();
  });

  it("reset() returns to idle", async () => {
    const { result } = renderHook(() =>
      useDecodeAnimation({ lang: "en" }),
    );

    act(() => {
      result.current.start("haeundae");
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(
        TIMING.EXPAND_DURATION_MS + TIMING.MIN_DECODE_MS + 100,
      );
    });

    expect(result.current.phase).toBe("resolved");

    act(() => {
      result.current.reset();
    });

    expect(result.current.phase).toBe("idle");
    expect(result.current.resolution).toBeNull();
    expect(result.current.targetChars).toEqual([]);
  });

  it("start() during resolved resets and starts new decode", async () => {
    const { result } = renderHook(() =>
      useDecodeAnimation({ lang: "en" }),
    );

    act(() => {
      result.current.start("haeundae");
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(
        TIMING.EXPAND_DURATION_MS + TIMING.MIN_DECODE_MS + 100,
      );
    });

    expect(result.current.phase).toBe("resolved");

    // Start a new search
    act(() => {
      result.current.start("jagalchi");
    });

    expect(result.current.phase).toBe("expanding");
    expect(result.current.resolution).toBeNull();
  });
});
