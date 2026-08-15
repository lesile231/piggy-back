// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useResolve } from "./use-resolve";
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
      nameKo: "해운대 해수욕장",
      nameLocalized: "Haeundae Beach",
      romanized: "Haeundae Beach",
      confidence: 1.0,
    },
  ],
};

describe("useResolve", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_RESOLUTION),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("starts with null resolution and no loading", () => {
    const { result } = renderHook(() => useResolve());
    expect(result.current.resolution).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("debounces and resolves after delay", async () => {
    const { result } = renderHook(() => useResolve({ debounceMs: 100 }));

    act(() => {
      result.current.resolve("haeundae");
    });

    expect(result.current.isLoading).toBe(true);
    expect(global.fetch).not.toHaveBeenCalled();

    // Advance past debounce and flush microtasks
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(result.current.resolution).toEqual(MOCK_RESOLUTION);
    expect(result.current.isLoading).toBe(false);
  });

  it("clears resolution on empty input", () => {
    const { result } = renderHook(() => useResolve());

    act(() => {
      result.current.resolve("   ");
    });

    expect(result.current.resolution).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it("clear() resets state", async () => {
    const { result } = renderHook(() => useResolve({ debounceMs: 50 }));

    act(() => {
      result.current.resolve("haeundae");
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });

    expect(result.current.resolution).toEqual(MOCK_RESOLUTION);

    act(() => {
      result.current.clear();
    });

    expect(result.current.resolution).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("sets error on failed fetch", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const { result } = renderHook(() => useResolve({ debounceMs: 50 }));

    act(() => {
      result.current.resolve("bad query");
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });

    expect(result.current.error).toBe("Resolution failed");
    expect(result.current.resolution).toBeNull();
  });

  it("passes lang param to fetch URL", async () => {
    const { result } = renderHook(() =>
      useResolve({ lang: "ja", debounceMs: 50 }),
    );

    act(() => {
      result.current.resolve("海雲台");
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("lang=ja"),
      expect.anything(),
    );
  });
});
