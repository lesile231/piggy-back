"use client";

import { useState, useCallback, useRef, useEffect } from "react";
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
    nearbyPlaces: string;
    othersLookingFor: string;
    searchAgain: string;
  };
  popularChips: { label: string; query: string }[];
}

export function DecodeBoard({ locale, dict, popularChips }: DecodeBoardProps) {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [showResult, setShowResult] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

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
    resultTimerRef.current = setTimeout(() => {
      setShowResult(true);
    }, TIMING.RESULT_DELAY_MS);
  }, []);

  const handleNewSearch = useCallback(() => {
    if (resultTimerRef.current) {
      clearTimeout(resultTimerRef.current);
      resultTimerRef.current = null;
    }
    reset();
    setQuery("");
    setSubmittedQuery("");
    setShowResult(false);
    inputRef.current?.focus();
  }, [reset]);

  const handleRetry = useCallback(() => {
    if (submittedQuery) {
      if (resultTimerRef.current) {
        clearTimeout(resultTimerRef.current);
        resultTimerRef.current = null;
      }
      setShowResult(false);
      start(submittedQuery);
    }
  }, [submittedQuery, start]);

  const inputChars = submittedQuery.split("");
  const isActive = phase !== "idle";

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (resultTimerRef.current) {
        clearTimeout(resultTimerRef.current);
      }
    };
  }, []);

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
          className="w-full rounded-xl border border-[rgba(0,119,182,0.2)] bg-white px-5 py-4 text-lg
                     text-[#1B3A4B] placeholder:text-[#9BB8C9]
                     focus:border-[#0077B6] focus:outline-none
                     pr-14"
        />
        <button
          type="submit"
          disabled={!query.trim() || phase === "expanding" || phase === "decoding"}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg
                     bg-[#0077B6] px-3 py-1.5 text-sm font-medium text-white
                     transition-colors hover:bg-[#005F92]
                     disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ⌕
        </button>
      </form>

      {/* Decode board */}
      {isActive && (
        <div className="decode-board-expand mt-4 rounded-xl bg-[#EBF4FA] px-4 py-6
                        shadow-[0_1px_0_rgba(0,119,182,0.05)_inset,0_8px_30px_rgba(0,50,80,0.1)]
                        sm:px-6 sm:py-8">
          {/* IN row */}
          <DecodeBoardRow
            label="IN"
            characters={inputChars}
            decodePhase={phase}
            isResolved={false}
          />

          {/* Divider */}
          <div className="my-3 border-t border-dashed border-[rgba(0,50,80,0.12)] sm:my-4" />

          {/* OUT row */}
          <DecodeBoardRow
            label="OUT"
            characters={targetChars}
            decodePhase={phase}
            isResolved={phase === "resolved"}
            onAllLocked={handleAllLocked}
            prefersReducedMotion={prefersReducedMotion}
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
                className="text-xs text-[#6B8FA3] transition-colors hover:text-[#0077B6]"
              >
                {dict.searchAgain}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Popular chips (visible when idle) */}
      {!isActive && (
        <div className="mt-6 text-center">
          <p className="text-xs text-[#6B8FA3]">
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
                className="rounded-full border border-[rgba(0,119,182,0.2)] px-3 py-1 text-sm
                           text-[#5A8296] transition-colors hover:border-[#0077B6]
                           hover:text-[#0077B6]"
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
