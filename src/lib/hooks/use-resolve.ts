"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Resolution } from "@/types/ai";

const DEBOUNCE_MS = 200;

interface UseResolveOptions {
  lang?: string;
  debounceMs?: number;
}

interface UseResolveReturn {
  resolution: Resolution | null;
  isLoading: boolean;
  error: string | null;
  resolve: (query: string) => void;
  clear: () => void;
}

const EMPTY_RESOLUTION: Resolution = {
  query: "",
  normalizedQuery: "",
  detectedLang: "en",
  stage: null,
  action: "empty",
  matches: [],
};

/**
 * Client-side hook for real-time location resolution.
 * Debounces input and calls /api/resolve, returning the Resolution object.
 * Foundation for the transshipment strip (§5.4).
 */
export function useResolve(options: UseResolveOptions = {}): UseResolveReturn {
  const { lang = "en", debounceMs = DEBOUNCE_MS } = options;

  const [resolution, setResolution] = useState<Resolution | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (abortRef.current) abortRef.current.abort();
    setResolution(null);
    setIsLoading(false);
    setError(null);
  }, []);

  const resolve = useCallback(
    (query: string) => {
      // Clear previous timer
      if (timerRef.current) clearTimeout(timerRef.current);

      const trimmed = query.trim();
      if (!trimmed) {
        clear();
        return;
      }

      setIsLoading(true);
      setError(null);

      timerRef.current = setTimeout(async () => {
        // Abort any in-flight request
        if (abortRef.current) abortRef.current.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        try {
          const params = new URLSearchParams({ q: trimmed, lang });
          const res = await fetch(`/api/resolve?${params}`, {
            signal: controller.signal,
          });

          if (!res.ok) {
            setError("Resolution failed");
            setResolution(null);
            return;
          }

          const data: Resolution = await res.json();
          if (!controller.signal.aborted) {
            setResolution(data);
            setError(null);
          }
        } catch (err) {
          if (err instanceof DOMException && err.name === "AbortError") return;
          setError("Resolution failed");
          setResolution(null);
        } finally {
          if (!controller.signal.aborted) {
            setIsLoading(false);
          }
        }
      }, debounceMs);
    },
    [lang, debounceMs, clear],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  return { resolution, isLoading, error, resolve, clear };
}
