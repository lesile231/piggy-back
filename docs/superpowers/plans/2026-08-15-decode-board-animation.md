# Decode Board Animation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current inline transshipment strip with a split-flap "decode board" that cycles through multi-script characters when the user searches, creating a dramatic reveal animation before showing results.

**Architecture:** A `DecodeBoard` orchestrator manages a state machine (`idle → expanding → decoding → resolved`). Individual `FlapSlot` components handle per-character flip animations using CSS `rotateX` transforms. A `useDecodeAnimation` hook synchronizes the API response with a minimum animation duration so the decode effect always plays out.

**Tech Stack:** React 19, CSS 3D transforms (rotateX + perspective), vitest + @testing-library/react

**Spec:** `docs/superpowers/specs/2026-08-15-decode-board-animation-design.md`

## Global Constraints

- Next.js 16.3 / React 19.2 / TypeScript strict
- Tailwind CSS v4 with `@theme inline` — custom properties via `globals.css`
- Vitest 4 with `@testing-library/react` — hook tests use `// @vitest-environment jsdom`
- Existing types in `src/types/ai.ts`: `Resolution`, `ResolutionMatch`, `ResolutionAction`
- Existing API: `GET /api/resolve?q=<query>&lang=<lang>` returns `Resolution`
- `prefers-reduced-motion: reduce` must skip all cycling/flip, show result instantly
- Mobile-first: 360px minimum, slots resize at 480px and 768px breakpoints
- No new npm dependencies — pure CSS + React

---

### Task 1: Constants and Types

**Files:**
- Create: `src/components/user/decode-board/constants.ts`
- Test: `src/components/user/decode-board/constants.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `DECODE_CHARS_BY_SCRIPT: Record<Script, string[]>` — character sets per script
  - `DECODE_CYCLE_ORDER: Script[]` — script rotation order
  - `TIMING` — object with all timing constants
  - `DecodePhase` — `"idle" | "expanding" | "decoding" | "resolved"`
  - `SlotPhase` — `"waiting" | "cycling" | "decelerating" | "locked"`
  - `buildCycleSequence(): string[]` — flat array of chars in script order for cycling

- [ ] **Step 1: Write test for character sets and cycle sequence**

```ts
// src/components/user/decode-board/constants.test.ts
import { describe, it, expect } from "vitest";
import {
  DECODE_CHARS_BY_SCRIPT,
  DECODE_CYCLE_ORDER,
  TIMING,
  buildCycleSequence,
} from "./constants";

describe("constants", () => {
  it("has four script character sets", () => {
    expect(Object.keys(DECODE_CHARS_BY_SCRIPT)).toEqual([
      "latin",
      "katakana",
      "cjk",
      "hangul",
    ]);
  });

  it("each script set has at least 10 characters", () => {
    for (const [script, chars] of Object.entries(DECODE_CHARS_BY_SCRIPT)) {
      expect(chars.length, `${script} should have ≥10 chars`).toBeGreaterThanOrEqual(10);
    }
  });

  it("has no duplicate characters within a script set", () => {
    for (const [script, chars] of Object.entries(DECODE_CHARS_BY_SCRIPT)) {
      const unique = new Set(chars);
      expect(unique.size, `${script} has duplicates`).toBe(chars.length);
    }
  });

  it("cycle order includes all four scripts", () => {
    expect(DECODE_CYCLE_ORDER).toEqual(["latin", "katakana", "cjk", "hangul"]);
  });

  it("buildCycleSequence returns flat array in script order", () => {
    const seq = buildCycleSequence();
    // First chars should be latin, then katakana, then cjk, then hangul
    expect(seq[0]).toBe(DECODE_CHARS_BY_SCRIPT.latin[0]);
    const latinLen = DECODE_CHARS_BY_SCRIPT.latin.length;
    expect(seq[latinLen]).toBe(DECODE_CHARS_BY_SCRIPT.katakana[0]);
    // Total length = sum of all script lengths
    const totalLen = Object.values(DECODE_CHARS_BY_SCRIPT).reduce(
      (sum, arr) => sum + arr.length,
      0,
    );
    expect(seq).toHaveLength(totalLen);
  });

  it("TIMING has required numeric fields", () => {
    expect(TIMING.MIN_DECODE_MS).toBeGreaterThanOrEqual(1000);
    expect(TIMING.FLIP_INTERVAL_FAST_MS).toBeLessThan(TIMING.FLIP_INTERVAL_SLOW_MS);
    expect(TIMING.SLOT_STAGGER_MS).toBeGreaterThan(0);
    expect(TIMING.EXPAND_DURATION_MS).toBeGreaterThan(0);
    expect(TIMING.LOCK_SCALE_DURATION_MS).toBeGreaterThan(0);
    expect(TIMING.RESULT_DELAY_MS).toBeGreaterThan(0);
    expect(TIMING.RESULT_FADE_MS).toBeGreaterThan(0);
    expect(TIMING.MAX_WAIT_MS).toBeGreaterThan(TIMING.MIN_DECODE_MS);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/user/decode-board/constants.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement constants**

```ts
// src/components/user/decode-board/constants.ts

export type Script = "latin" | "katakana" | "cjk" | "hangul";

export type DecodePhase = "idle" | "expanding" | "decoding" | "resolved";

export type SlotPhase = "waiting" | "cycling" | "decelerating" | "locked";

export const DECODE_CHARS_BY_SCRIPT: Record<Script, string[]> = {
  latin: "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
  katakana: "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホ".split(""),
  cjk: "海雲台山川寺市場港島城橋路門浦津洞里".split(""),
  hangul: "가나다라마바사아자차카타파하해운대부산리".split(""),
};

export const DECODE_CYCLE_ORDER: Script[] = [
  "latin",
  "katakana",
  "cjk",
  "hangul",
];

/** Build a flat character array cycling through scripts in order. */
export function buildCycleSequence(): string[] {
  return DECODE_CYCLE_ORDER.flatMap(
    (script) => DECODE_CHARS_BY_SCRIPT[script],
  );
}

export const TIMING = {
  /** Minimum decode animation time, even if API responds instantly */
  MIN_DECODE_MS: 1200,
  /** Maximum wait for API before showing timeout error */
  MAX_WAIT_MS: 5000,
  /** Fast flip interval during cycling phase */
  FLIP_INTERVAL_FAST_MS: 50,
  /** Slow flip interval during deceleration phase */
  FLIP_INTERVAL_SLOW_MS: 200,
  /** Delay between each slot starting its animation */
  SLOT_STAGGER_MS: 120,
  /** Duration of the board expand animation */
  EXPAND_DURATION_MS: 300,
  /** Duration of the lock scale pulse (1.08 → 1.0) */
  LOCK_SCALE_DURATION_MS: 150,
  /** Delay after last slot locks before showing result card */
  RESULT_DELAY_MS: 200,
  /** Result card fade-in duration */
  RESULT_FADE_MS: 400,
} as const;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/user/decode-board/constants.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/user/decode-board/constants.ts src/components/user/decode-board/constants.test.ts
git commit -m "feat(decode-board): add character sets, timing constants, and phase types"
```

---

### Task 2: fetchResolution utility

A standalone async function that calls `/api/resolve` and returns a `Promise<Resolution>`. The existing `useResolve` hook uses callback/state pattern with debounce. The decode board needs a Promise it can race against the minimum timer.

**Files:**
- Create: `src/components/user/decode-board/fetch-resolution.ts`
- Test: `src/components/user/decode-board/fetch-resolution.test.ts`

**Interfaces:**
- Consumes: `Resolution` type from `@/types/ai`
- Produces: `fetchResolution(query: string, lang: string, signal?: AbortSignal): Promise<Resolution>`

- [ ] **Step 1: Write tests**

```ts
// src/components/user/decode-board/fetch-resolution.test.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/user/decode-board/fetch-resolution.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement fetchResolution**

```ts
// src/components/user/decode-board/fetch-resolution.ts
import type { Resolution } from "@/types/ai";

/**
 * Promise-based resolution fetch for the decode board.
 * Unlike useResolve (callback/debounce pattern), this returns a
 * Promise that the animation hook can race against the minimum timer.
 */
export async function fetchResolution(
  query: string,
  lang: string,
  signal?: AbortSignal,
): Promise<Resolution> {
  const params = new URLSearchParams({ q: query, lang });
  const res = await fetch(`/api/resolve?${params}`, { signal });

  if (!res.ok) {
    throw new Error("Resolution failed");
  }

  return res.json();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/user/decode-board/fetch-resolution.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/user/decode-board/fetch-resolution.ts src/components/user/decode-board/fetch-resolution.test.ts
git commit -m "feat(decode-board): add fetchResolution async utility"
```

---

### Task 3: useDecodeAnimation hook — state machine + API sync

The orchestration hook. Manages the `DecodePhase` state machine and synchronizes the API response with the minimum animation time.

**Files:**
- Create: `src/components/user/decode-board/use-decode-animation.ts`
- Test: `src/components/user/decode-board/use-decode-animation.test.ts`

**Interfaces:**
- Consumes:
  - `fetchResolution(query, lang, signal)` from Task 2
  - `DecodePhase`, `TIMING` from Task 1
  - `Resolution` from `@/types/ai`
- Produces:
  ```ts
  interface UseDecodeAnimationReturn {
    phase: DecodePhase;
    resolution: Resolution | null;
    error: string | null;
    targetChars: string[];   // characters to lock onto (from resolution)
    start: (query: string) => void;
    reset: () => void;
  }

  function useDecodeAnimation(options: { lang: string }): UseDecodeAnimationReturn
  ```

- [ ] **Step 1: Write tests for state machine transitions**

```ts
// src/components/user/decode-board/use-decode-animation.test.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/user/decode-board/use-decode-animation.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement the hook**

```ts
// src/components/user/decode-board/use-decode-animation.ts
"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { Resolution } from "@/types/ai";
import { fetchResolution } from "./fetch-resolution";
import { TIMING, type DecodePhase } from "./constants";

interface UseDecodeAnimationOptions {
  lang: string;
}

export interface UseDecodeAnimationReturn {
  phase: DecodePhase;
  resolution: Resolution | null;
  error: string | null;
  /** Individual characters of the resolved Korean name */
  targetChars: string[];
  /** Start the decode animation for a query */
  start: (query: string) => void;
  /** Reset back to idle */
  reset: () => void;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function useDecodeAnimation(
  options: UseDecodeAnimationOptions,
): UseDecodeAnimationReturn {
  const { lang } = options;

  const [phase, setPhase] = useState<DecodePhase>("idle");
  const [resolution, setResolution] = useState<Resolution | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [targetChars, setTargetChars] = useState<string[]>([]);

  const abortRef = useRef<AbortController | null>(null);
  const runIdRef = useRef(0);

  const reset = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
    runIdRef.current++;
    setPhase("idle");
    setResolution(null);
    setError(null);
    setTargetChars([]);
  }, []);

  const start = useCallback(
    (query: string) => {
      // Abort any in-flight request
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const currentRun = ++runIdRef.current;

      // Reset state for new search
      setResolution(null);
      setError(null);
      setTargetChars([]);
      setPhase("expanding");

      const run = async () => {
        // Phase: expanding → decoding
        await delay(TIMING.EXPAND_DURATION_MS);
        if (currentRun !== runIdRef.current) return;
        setPhase("decoding");

        // Race API against min time and max timeout
        try {
          const timeoutPromise = delay(TIMING.MAX_WAIT_MS).then(() => {
            throw new Error("Request timed out");
          });

          const [result] = await Promise.all([
            Promise.race([
              fetchResolution(query, lang, controller.signal),
              timeoutPromise,
            ]),
            delay(TIMING.MIN_DECODE_MS),
          ]);

          if (currentRun !== runIdRef.current) return;

          const res = result as Resolution;
          setResolution(res);

          // Extract target characters from top match Korean name
          const topMatch = res.matches[0];
          if (topMatch) {
            setTargetChars(topMatch.nameKo.split(""));
          }
        } catch (err) {
          if (currentRun !== runIdRef.current) return;
          if (err instanceof DOMException && err.name === "AbortError") return;
          setError(
            err instanceof Error ? err.message : "Resolution failed",
          );
        } finally {
          if (currentRun === runIdRef.current) {
            setPhase("resolved");
          }
        }
      };

      run();
    },
    [lang],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
      runIdRef.current++;
    };
  }, []);

  return { phase, resolution, error, targetChars, start, reset };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/user/decode-board/use-decode-animation.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/user/decode-board/use-decode-animation.ts src/components/user/decode-board/use-decode-animation.test.ts
git commit -m "feat(decode-board): add useDecodeAnimation hook with state machine and API sync"
```

---

### Task 4: FlapSlot component — per-character flip animation

The atomic animation unit. Each slot cycles through multi-script characters and locks onto a target.

**Files:**
- Create: `src/components/user/decode-board/FlapSlot.tsx`
- Modify: `src/app/globals.css` (append keyframes)
- Test: `src/components/user/decode-board/FlapSlot.test.ts`

**Interfaces:**
- Consumes:
  - `SlotPhase`, `buildCycleSequence()`, `TIMING` from Task 1
- Produces:
  ```ts
  interface FlapSlotProps {
    phase: SlotPhase;
    targetChar: string;
    onLocked?: () => void;
  }
  function FlapSlot(props: FlapSlotProps): JSX.Element
  ```

- [ ] **Step 1: Write tests for FlapSlot rendering and state transitions**

```ts
// src/components/user/decode-board/FlapSlot.test.ts
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { FlapSlot } from "./FlapSlot";

describe("FlapSlot", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders target char when phase is locked", () => {
    render(<FlapSlot phase="locked" targetChar="해" />);
    const slot = screen.getByTestId("flap-slot");
    expect(slot.textContent).toContain("해");
  });

  it("applies locked class with signal color when phase is locked", () => {
    render(<FlapSlot phase="locked" targetChar="해" />);
    const slot = screen.getByTestId("flap-slot");
    expect(slot.className).toContain("locked");
  });

  it("shows a space when phase is waiting", () => {
    render(<FlapSlot phase="waiting" targetChar="해" />);
    const charEl = screen.getByTestId("flap-char");
    // Non-breaking space or empty
    expect(charEl.textContent?.trim()).toBe("");
  });

  it("cycles through characters when phase is cycling", async () => {
    render(<FlapSlot phase="cycling" targetChar="해" />);
    const charEl = screen.getByTestId("flap-char");
    const initial = charEl.textContent;

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60);
    });

    // Character should have changed
    expect(charEl.textContent).not.toBe(initial);
  });

  it("calls onLocked when transitioning to locked phase", () => {
    const onLocked = vi.fn();
    const { rerender } = render(
      <FlapSlot phase="cycling" targetChar="해" onLocked={onLocked} />,
    );

    rerender(
      <FlapSlot phase="locked" targetChar="해" onLocked={onLocked} />,
    );

    expect(onLocked).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/user/decode-board/FlapSlot.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Add CSS keyframes to globals.css**

Append to the bottom of `src/app/globals.css`:

```css
/* ── Decode Board: FlapSlot animations ── */

@keyframes flap-flip {
  0% { transform: rotateX(0deg); }
  50% { transform: rotateX(90deg); }
  100% { transform: rotateX(0deg); }
}

@keyframes flap-lock-pulse {
  0% { transform: scale(1.08); }
  100% { transform: scale(1); }
}

@keyframes decode-expand {
  from { max-height: 0; opacity: 0; }
  to { max-height: 500px; opacity: 1; }
}

@keyframes result-slide-in {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

.flap-slot {
  perspective: 300px;
}

.flap-char-flip {
  animation: flap-flip 50ms ease-in-out;
}

.flap-slot.locked .flap-char {
  animation: flap-lock-pulse 150ms ease-out;
  color: #FF4D14;
}

.decode-board-expand {
  animation: decode-expand 300ms ease-out forwards;
  overflow: hidden;
}

.decode-result-enter {
  animation: result-slide-in 400ms ease-out forwards;
}

/* §5.4 prefers-reduced-motion */
@media (prefers-reduced-motion: reduce) {
  .flap-char-flip,
  .flap-slot.locked .flap-char {
    animation: none;
  }

  .decode-board-expand {
    animation: none;
    max-height: 500px;
    opacity: 1;
  }

  .decode-result-enter {
    animation: none;
    opacity: 1;
    transform: none;
  }
}
```

- [ ] **Step 4: Implement FlapSlot component**

```tsx
// src/components/user/decode-board/FlapSlot.tsx
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { buildCycleSequence, TIMING, type SlotPhase } from "./constants";

interface FlapSlotProps {
  phase: SlotPhase;
  targetChar: string;
  onLocked?: () => void;
}

const cycleSequence = buildCycleSequence();
const NBSP = "\u00A0";

export function FlapSlot({ phase, targetChar, onLocked }: FlapSlotProps) {
  const [displayChar, setDisplayChar] = useState(NBSP);
  const [isFlipping, setIsFlipping] = useState(false);
  const cycleIndexRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevPhaseRef = useRef<SlotPhase>(phase);

  const clearCycling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Handle phase transitions
  useEffect(() => {
    const prevPhase = prevPhaseRef.current;
    prevPhaseRef.current = phase;

    if (phase === "waiting") {
      clearCycling();
      setDisplayChar(NBSP);
      return;
    }

    if (phase === "cycling") {
      clearCycling();
      const interval = TIMING.FLIP_INTERVAL_FAST_MS;
      intervalRef.current = setInterval(() => {
        cycleIndexRef.current =
          (cycleIndexRef.current + 1) % cycleSequence.length;
        setIsFlipping(true);
        setDisplayChar(cycleSequence[cycleIndexRef.current]);
        // Remove flip class after animation
        setTimeout(() => setIsFlipping(false), 40);
      }, interval);
      return;
    }

    if (phase === "decelerating") {
      clearCycling();
      // Run through a decelerating sequence: 3 flips at increasing intervals
      const intervals = [100, 150, 200];
      let step = 0;

      const decel = () => {
        if (step >= intervals.length) {
          // Final: lock to target
          setDisplayChar(targetChar);
          setIsFlipping(false);
          return;
        }
        cycleIndexRef.current =
          (cycleIndexRef.current + 1) % cycleSequence.length;
        setIsFlipping(true);
        setDisplayChar(cycleSequence[cycleIndexRef.current]);
        setTimeout(() => setIsFlipping(false), 40);
        step++;
        intervalRef.current = setTimeout(decel, intervals[step - 1]);
      };

      decel();
      return;
    }

    if (phase === "locked") {
      clearCycling();
      setDisplayChar(targetChar);
      setIsFlipping(false);
      if (prevPhase !== "locked" && onLocked) {
        onLocked();
      }
      return;
    }
  }, [phase, targetChar, clearCycling, onLocked]);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearCycling();
  }, [clearCycling]);

  const isLocked = phase === "locked";

  return (
    <div
      data-testid="flap-slot"
      className={`flap-slot relative flex items-center justify-center
                  rounded-sm border
                  ${isLocked
                    ? "locked border-[rgba(255,77,20,0.3)] bg-[#2A2D30]"
                    : "border-[rgba(255,255,255,0.06)] bg-[#2A2D30]"}
                  h-10 w-8 sm:h-12 sm:w-10 md:h-[4.5rem] md:w-14`}
    >
      {/* Crease line */}
      <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-[rgba(0,0,0,0.4)]" />

      {/* Character */}
      <span
        data-testid="flap-char"
        className={`flap-char select-none font-mono text-xl leading-none
                    sm:text-2xl md:text-4xl
                    ${isFlipping ? "flap-char-flip" : ""}
                    ${isLocked ? "text-[#FF4D14]" : "text-[#C8CCD0]"}`}
      >
        {displayChar}
      </span>
    </div>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/components/user/decode-board/FlapSlot.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/user/decode-board/FlapSlot.tsx src/components/user/decode-board/FlapSlot.test.ts src/app/globals.css
git commit -m "feat(decode-board): add FlapSlot component with multi-script cycling animation"
```

---

### Task 5: DecodeBoardRow component

A row of `FlapSlot`s with staggered phase transitions. The IN row shows input text statically. The OUT row manages per-slot phasing.

**Files:**
- Create: `src/components/user/decode-board/DecodeBoardRow.tsx`

**Interfaces:**
- Consumes:
  - `FlapSlot` from Task 4
  - `SlotPhase`, `TIMING` from Task 1
  - `DecodePhase` from Task 1
- Produces:
  ```ts
  interface DecodeBoardRowProps {
    label: string;                 // "IN" or "OUT"
    characters: string[];          // chars to display/target
    decodePhase: DecodePhase;      // parent board phase
    isResolved: boolean;           // true when API responded + min time met
    onAllLocked?: () => void;      // callback when all slots locked
  }
  function DecodeBoardRow(props: DecodeBoardRowProps): JSX.Element
  ```

- [ ] **Step 1: Implement DecodeBoardRow**

The IN row is simpler — it just displays characters in slots without animation. The OUT row manages staggered cycling.

```tsx
// src/components/user/decode-board/DecodeBoardRow.tsx
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { FlapSlot } from "./FlapSlot";
import { TIMING, type DecodePhase, type SlotPhase } from "./constants";

interface DecodeBoardRowProps {
  label: string;
  characters: string[];
  decodePhase: DecodePhase;
  isResolved: boolean;
  onAllLocked?: () => void;
}

export function DecodeBoardRow({
  label,
  characters,
  decodePhase,
  isResolved,
  onAllLocked,
}: DecodeBoardRowProps) {
  const isOutRow = label.toUpperCase() === "OUT";
  const slotCount = characters.length || 6; // default 6 slots when no chars yet
  const chars = characters.length > 0 ? characters : Array(slotCount).fill("");

  const [slotPhases, setSlotPhases] = useState<SlotPhase[]>(
    Array(slotCount).fill("waiting"),
  );
  const lockedCountRef = useRef(0);
  const staggerTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    staggerTimersRef.current.forEach((t) => clearTimeout(t));
    staggerTimersRef.current = [];
  }, []);

  // Manage OUT row staggered phases based on parent decode phase
  useEffect(() => {
    if (!isOutRow) return;

    if (decodePhase === "idle") {
      clearTimers();
      lockedCountRef.current = 0;
      setSlotPhases(Array(slotCount).fill("waiting"));
      return;
    }

    if (decodePhase === "expanding") {
      clearTimers();
      lockedCountRef.current = 0;
      setSlotPhases(Array(slotCount).fill("waiting"));
      return;
    }

    if (decodePhase === "decoding") {
      // Start cycling with stagger
      clearTimers();
      lockedCountRef.current = 0;
      const newPhases = Array(slotCount).fill("waiting") as SlotPhase[];
      setSlotPhases([...newPhases]);

      for (let i = 0; i < slotCount; i++) {
        const timer = setTimeout(() => {
          setSlotPhases((prev) => {
            const next = [...prev];
            next[i] = "cycling";
            return next;
          });
        }, i * TIMING.SLOT_STAGGER_MS);
        staggerTimersRef.current.push(timer);
      }
      return;
    }
  }, [decodePhase, isOutRow, slotCount, clearTimers]);

  // When API resolves during decoding, start locking slots
  useEffect(() => {
    if (!isOutRow || !isResolved || decodePhase !== "resolved") return;

    clearTimers();
    const actualCount = characters.length;

    // Update slot count to match actual characters if needed
    setSlotPhases((prev) => {
      const next = Array(actualCount).fill("cycling") as SlotPhase[];
      return next;
    });

    // Stagger the deceleration → lock for each slot
    for (let i = 0; i < actualCount; i++) {
      const timer = setTimeout(() => {
        setSlotPhases((prev) => {
          const next = [...prev];
          next[i] = "locked";
          return next;
        });
      }, i * TIMING.SLOT_STAGGER_MS);
      staggerTimersRef.current.push(timer);
    }
  }, [isResolved, decodePhase, isOutRow, characters.length, clearTimers]);

  const handleSlotLocked = useCallback(() => {
    lockedCountRef.current++;
    if (lockedCountRef.current >= characters.length && onAllLocked) {
      onAllLocked();
    }
  }, [characters.length, onAllLocked]);

  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  // For IN row: show chars statically in locked state
  const inRowPhases = chars.map(() => "locked" as SlotPhase);

  const resolvedLabel =
    isOutRow && decodePhase === "resolved" && characters.length > 0;

  return (
    <div className="flex items-center gap-3">
      {/* Row label */}
      <span
        className={`w-20 shrink-0 text-right font-mono text-xs font-semibold
                    uppercase tracking-[0.15em]
                    ${resolvedLabel ? "text-[#FF4D14]" : "text-[#5A5F63]"}`}
      >
        {resolvedLabel ? "resolved" : label}
      </span>

      {/* Flap slots */}
      <div className="flex gap-1">
        {chars.map((char, i) => (
          <FlapSlot
            key={`${label}-${i}`}
            phase={isOutRow ? (slotPhases[i] ?? "waiting") : inRowPhases[i]}
            targetChar={char}
            onLocked={isOutRow ? handleSlotLocked : undefined}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit --pretty`
Expected: No errors related to DecodeBoardRow

- [ ] **Step 3: Commit**

```bash
git add src/components/user/decode-board/DecodeBoardRow.tsx
git commit -m "feat(decode-board): add DecodeBoardRow with staggered slot phasing"
```

---

### Task 6: DecodeResult component — result card after decode

Shows the decoded place information with confidence-based actions.

**Files:**
- Create: `src/components/user/decode-board/DecodeResult.tsx`

**Interfaces:**
- Consumes:
  - `Resolution`, `ResolutionAction` from `@/types/ai`
  - `Button` from `@/components/ui/Button`
- Produces:
  ```ts
  interface DecodeResultProps {
    resolution: Resolution;
    error: string | null;
    locale: string;
    dict: { emptyState: string; networkError: string; retry: string; didYouMean: string };
    popularChips: { label: string; query: string }[];
    onRetry?: () => void;
    onNewSearch?: () => void;
  }
  function DecodeResult(props: DecodeResultProps): JSX.Element
  ```

- [ ] **Step 1: Implement DecodeResult**

```tsx
// src/components/user/decode-board/DecodeResult.tsx
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import type { Resolution } from "@/types/ai";

interface DecodeResultProps {
  resolution: Resolution | null;
  error: string | null;
  locale: string;
  dict: {
    emptyState: string;
    networkError: string;
    retry: string;
    didYouMean: string;
  };
  popularChips: { label: string; query: string }[];
  onRetry?: () => void;
  onNewSearch?: () => void;
}

export function DecodeResult({
  resolution,
  error,
  locale,
  dict,
  popularChips,
  onRetry,
  onNewSearch,
}: DecodeResultProps) {
  // Error state
  if (error) {
    return (
      <div className="decode-result-enter mt-4 rounded-lg bg-[#2A2D30] px-5 py-4">
        <p className="text-sm text-[#C8CCD0]">{dict.networkError}</p>
        <div className="mt-3 flex gap-2">
          {onRetry && (
            <Button variant="secondary" size="sm" onClick={onRetry}>
              {dict.retry}
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (!resolution) return null;

  const { action, matches } = resolution;

  // Empty state — no matches
  if (action === "empty" || matches.length === 0) {
    return (
      <div className="decode-result-enter mt-4 rounded-lg bg-[#2A2D30] px-5 py-4">
        <p className="text-sm text-[#C8CCD0]">{dict.emptyState}</p>
        {popularChips.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {popularChips.slice(0, 6).map((chip) => (
              <button
                key={chip.query}
                onClick={() => onNewSearch?.()}
                className="rounded-full border border-[rgba(255,255,255,0.1)] px-3 py-1
                           text-xs text-[#C8CCD0] transition-colors
                           hover:border-[#FF4D14] hover:text-[#FF4D14]"
              >
                {chip.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  const top = matches[0];

  return (
    <div className="decode-result-enter mt-4 rounded-lg bg-[#2A2D30] px-5 py-4">
      {/* Place info */}
      <div className="flex items-baseline justify-between">
        <div>
          <p className="text-lg font-semibold text-white">
            {top.nameLocalized || top.nameKo}
          </p>
          {top.nameLocalized && top.nameLocalized !== top.nameKo && (
            <p className="mt-0.5 text-sm text-[#9AA3A0]" lang="ko">
              {top.nameKo}
            </p>
          )}
          {top.romanized && (
            <p className="mt-0.5 font-mono text-xs uppercase tracking-wide text-[#5A5F63]">
              {top.romanized}
            </p>
          )}
        </div>
        <span className="font-mono text-xs text-[#5A5F63]">
          {Math.round(top.confidence * 100)}%
        </span>
      </div>

      {/* CTA based on confidence */}
      <div className="mt-4">
        {(action === "navigate" || action === "confirm") && (
          <Link
            href={`/${locale}/place/${top.placeId}`}
            className="inline-flex items-center gap-2 rounded-lg bg-[#FF4D14] px-5 py-2.5
                       text-sm font-medium text-white transition-colors
                       hover:bg-[#e54512]"
          >
            {top.nameLocalized || top.nameKo}
            <span aria-hidden="true">&rarr;</span>
          </Link>
        )}
      </div>

      {/* Disambiguate: multiple candidates */}
      {action === "disambiguate" && matches.length > 1 && (
        <div className="mt-3 border-t border-[rgba(255,255,255,0.06)] pt-3">
          <p className="text-xs text-[#5A5F63]">{dict.didYouMean}</p>
          <ul className="mt-2 space-y-1">
            {matches.map((m) => (
              <li key={m.placeId}>
                <Link
                  href={`/${locale}/place/${m.placeId}`}
                  className="flex items-center justify-between rounded-lg px-3 py-2
                             text-sm text-[#C8CCD0] transition-colors
                             hover:bg-[rgba(255,255,255,0.05)]"
                >
                  <span>
                    <span className="font-medium text-white">
                      {m.nameLocalized || m.nameKo}
                    </span>
                    {m.nameLocalized && m.nameLocalized !== m.nameKo && (
                      <span className="ml-2 text-[#9AA3A0]">{m.nameKo}</span>
                    )}
                  </span>
                  <span className="font-mono text-xs text-[#5A5F63]">
                    {Math.round(m.confidence * 100)}%
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit --pretty`
Expected: No errors related to DecodeResult

- [ ] **Step 3: Commit**

```bash
git add src/components/user/decode-board/DecodeResult.tsx
git commit -m "feat(decode-board): add DecodeResult card with confidence-based actions"
```

---

### Task 7: DecodeBoard orchestrator — assemble all pieces

The top-level component that wires the hook, rows, and result card together.

**Files:**
- Create: `src/components/user/decode-board/DecodeBoard.tsx`
- Create: `src/components/user/decode-board/index.ts` (barrel export)

**Interfaces:**
- Consumes:
  - `useDecodeAnimation` from Task 3
  - `DecodeBoardRow` from Task 5
  - `DecodeResult` from Task 6
  - `TIMING` from Task 1
- Produces:
  ```ts
  interface DecodeBoardProps {
    locale: string;
    dict: { tagline: string; emptyState: string; networkError: string; retry: string; didYouMean: string; othersLookingFor: string };
    popularChips: { label: string; query: string }[];
  }
  function DecodeBoard(props: DecodeBoardProps): JSX.Element
  ```

- [ ] **Step 1: Implement DecodeBoard**

```tsx
// src/components/user/decode-board/DecodeBoard.tsx
"use client";

import { useState, useCallback, useRef } from "react";
import { useDecodeAnimation } from "./use-decode-animation";
import { DecodeBoardRow } from "./DecodeBoardRow";
import { DecodeResult } from "./DecodeResult";
import { TIMING } from "./constants";

interface DecodeBoardProps {
  locale: string;
  dict: {
    tagline: string;
    emptyState: string;
    networkError: string;
    retry: string;
    didYouMean: string;
    othersLookingFor: string;
  };
  popularChips: { label: string; query: string }[];
}

export function DecodeBoard({ locale, dict, popularChips }: DecodeBoardProps) {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [showResult, setShowResult] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { phase, resolution, error, targetChars, start, reset } =
    useDecodeAnimation({ lang: locale });

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = query.trim();
      if (!trimmed) return;
      setSubmittedQuery(trimmed);
      setShowResult(false);
      start(trimmed);
    },
    [query, start],
  );

  const handleAllLocked = useCallback(() => {
    // Show result card after delay
    setTimeout(() => {
      setShowResult(true);
    }, TIMING.RESULT_DELAY_MS);
  }, []);

  const handleNewSearch = useCallback(() => {
    reset();
    setQuery("");
    setSubmittedQuery("");
    setShowResult(false);
    inputRef.current?.focus();
  }, [reset]);

  const handleRetry = useCallback(() => {
    if (submittedQuery) {
      setShowResult(false);
      start(submittedQuery);
    }
  }, [submittedQuery, start]);

  const inputChars = submittedQuery.split("");
  const isActive = phase !== "idle";

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Search input */}
      <form onSubmit={handleSubmit} className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="hey oon day"
          className="w-full rounded-xl border border-zinc-300 bg-white px-5 py-4 text-lg
                     focus:border-zinc-500 focus:outline-none
                     dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100
                     pr-14"
        />
        <button
          type="submit"
          disabled={!query.trim() || phase === "expanding" || phase === "decoding"}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg
                     bg-[#FF4D14] px-3 py-1.5 text-sm font-medium text-white
                     transition-colors hover:bg-[#e54512]
                     disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ⌕
        </button>
      </form>

      {/* Decode board */}
      {isActive && (
        <div className="decode-board-expand mt-4 rounded-xl bg-[#1A1D1F] px-4 py-6
                        shadow-[0_1px_0_rgba(255,255,255,0.03)_inset,0_20px_60px_rgba(0,0,0,0.3)]
                        sm:px-6 sm:py-8">
          {/* IN row */}
          <DecodeBoardRow
            label="IN"
            characters={inputChars}
            decodePhase={phase}
            isResolved={false}
          />

          {/* Divider */}
          <div className="my-3 border-t border-dashed border-[rgba(255,255,255,0.08)] sm:my-4" />

          {/* OUT row */}
          <DecodeBoardRow
            label="OUT"
            characters={targetChars}
            decodePhase={phase}
            isResolved={phase === "resolved"}
            onAllLocked={handleAllLocked}
          />

          {/* Result card */}
          {showResult && (
            <DecodeResult
              resolution={resolution}
              error={error}
              locale={locale}
              dict={dict}
              popularChips={popularChips}
              onRetry={handleRetry}
              onNewSearch={handleNewSearch}
            />
          )}

          {/* New search button (visible after result) */}
          {showResult && (
            <div className="mt-4 text-center">
              <button
                onClick={handleNewSearch}
                className="text-xs text-[#5A5F63] transition-colors hover:text-[#C8CCD0]"
              >
                Search again
              </button>
            </div>
          )}
        </div>
      )}

      {/* Popular chips (visible when idle) */}
      {!isActive && (
        <div className="mt-6 text-center">
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            {dict.othersLookingFor}
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            {popularChips.map((chip) => (
              <button
                key={chip.query}
                onClick={() => {
                  setQuery(chip.label);
                  setSubmittedQuery(chip.label);
                  setShowResult(false);
                  start(chip.label);
                }}
                className="rounded-full border border-zinc-200 px-3 py-1 text-sm
                           text-zinc-600 transition-colors hover:border-[#FF4D14]
                           hover:text-[#FF4D14]
                           dark:border-zinc-700 dark:text-zinc-400"
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create barrel export**

```ts
// src/components/user/decode-board/index.ts
export { DecodeBoard } from "./DecodeBoard";
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit --pretty`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/components/user/decode-board/DecodeBoard.tsx src/components/user/decode-board/index.ts
git commit -m "feat(decode-board): add DecodeBoard orchestrator component"
```

---

### Task 8: Integration — replace TransshipmentStrip and update home page

Wire the new `DecodeBoard` into the home page, replacing the current inline strip.

**Files:**
- Modify: `src/app/[lang]/page.tsx` — replace `TransshipmentStrip` with `DecodeBoard`
- Modify: `src/app/[lang]/dictionaries/en.json` — no changes needed (existing `strip` keys are compatible)

**Interfaces:**
- Consumes: `DecodeBoard` from Task 7

- [ ] **Step 1: Update home page to use DecodeBoard**

Replace the import and usage in `src/app/[lang]/page.tsx`:

Change import from:
```ts
import { TransshipmentStrip } from "@/components/user/TransshipmentStrip";
```
to:
```ts
import { DecodeBoard } from "@/components/user/decode-board";
```

Replace the hero section JSX. The full `<section>` block starting at the `{/* §3.1 Hero */}` comment becomes:

```tsx
<section className="flex flex-col items-center text-center">
  <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
    PiggyBack
  </h1>
  <p className="mt-3 text-lg text-zinc-500 dark:text-zinc-400">
    {dict.strip.tagline}
  </p>

  {/* Decode Board — replaces TransshipmentStrip */}
  <div className="mt-8 w-full">
    <DecodeBoard
      locale={locale}
      dict={dict.strip}
      popularChips={POPULAR_CHIPS}
    />
  </div>
</section>
```

Remove the separate popular chips section below (the `<div className="mt-6">` block with `dict.strip.othersLookingFor`) since `DecodeBoard` renders its own chips.

- [ ] **Step 2: Verify the page renders**

Run: `npx next build` (or `npx next dev` and open `http://localhost:3000/en`)
Expected: Home page shows search input. Typing and pressing Enter triggers the decode board animation.

- [ ] **Step 3: Run existing tests to check nothing broke**

Run: `npx vitest run`
Expected: All existing tests pass. Some tests related to TransshipmentStrip may need updating if they import the old component.

- [ ] **Step 4: Commit**

```bash
git add src/app/[lang]/page.tsx
git commit -m "feat(decode-board): integrate DecodeBoard into home page, replace TransshipmentStrip"
```

---

### Task 9: Polish — responsive, reduced-motion, edge cases

Final polish pass for mobile breakpoints, accessibility, and edge cases.

**Files:**
- Modify: `src/components/user/decode-board/FlapSlot.tsx` — verify responsive sizing works
- Modify: `src/components/user/decode-board/DecodeBoardRow.tsx` — handle long names (>8 chars)
- Modify: `src/components/user/decode-board/DecodeBoard.tsx` — reduced-motion behavior
- Modify: `src/app/globals.css` — verify reduced-motion rules applied

- [ ] **Step 1: Add reduced-motion detection to DecodeBoard**

In `DecodeBoard.tsx`, add the `usePrefersReducedMotion` hook (same pattern already in the codebase at the bottom of `TransshipmentStrip.tsx`):

```tsx
function usePrefersReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return prefersReduced;
}
```

When `prefersReduced` is true:
- Skip the expanding animation (show board immediately)
- Skip FlapSlot cycling (show target chars directly in locked state)
- Result card appears with fade only (CSS handles this via the `@media (prefers-reduced-motion)` rules)

- [ ] **Step 2: Handle long Korean names in DecodeBoardRow**

In `DecodeBoardRow.tsx`, if `characters.length > 8` on mobile (<480px), add `flex-wrap` to the slots container:

```tsx
<div className="flex flex-wrap gap-1">
```

This ensures names like "해운대해수욕장" (7 chars) fit on one line, but very long names wrap gracefully.

- [ ] **Step 3: Test on mobile viewport**

Open Chrome DevTools, set viewport to 360px width.
Verify:
- Slots are 2rem × 2.5rem
- Board fits within viewport without horizontal scroll
- Result card text doesn't overflow
- Search input is usable

- [ ] **Step 4: Test reduced-motion**

In Chrome DevTools → Rendering → "Emulate CSS media feature prefers-reduced-motion" → "reduce"
Verify:
- No character cycling animation
- Board appears without expand animation
- Result shows immediately
- No jarring visual effects

- [ ] **Step 5: Test edge cases**

- Empty search: button should be disabled
- Very short query ("a"): should work, may return empty
- Very long query (30+ chars): IN row should handle without breaking layout
- Rapid re-search: start new search while decoding — should abort previous, start fresh
- Network error: error card should show with retry button

- [ ] **Step 6: Commit**

```bash
git add src/components/user/decode-board/
git commit -m "feat(decode-board): add responsive, reduced-motion, and edge case handling"
```

- [ ] **Step 7: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 8: Final commit with all polish**

```bash
git add -A
git commit -m "feat: decode board animation — split-flap search experience"
```
