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
