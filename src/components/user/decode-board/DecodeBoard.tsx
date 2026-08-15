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
