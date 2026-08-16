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
    nearbyPlaces: string;
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
      <div className="decode-result-enter mt-4 rounded-lg bg-white px-5 py-4">
        <p className="text-sm text-[#1B3A4B]">{dict.networkError}</p>
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
      <div className="decode-result-enter mt-4 rounded-lg bg-white px-5 py-4">
        <p className="text-sm text-[#1B3A4B]">{dict.emptyState}</p>
        {popularChips.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {popularChips.slice(0, 6).map((chip) => (
              <button
                key={chip.query}
                onClick={() => onNewSearch?.()}
                className="rounded-full border border-[rgba(0,50,80,0.12)] px-3 py-1
                           text-xs text-[#1B3A4B] transition-colors
                           hover:border-[#0077B6] hover:text-[#0077B6]"
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
  if (!top) return null;

  return (
    <div className="decode-result-enter mt-4 rounded-lg bg-white px-5 py-4">
      {/* Place info */}
      <div className="flex items-baseline justify-between">
        <div>
          <p className="text-lg font-semibold text-[#0A2540]">
            {top.nameLocalized || top.nameKo}
          </p>
          {top.nameLocalized && top.nameLocalized !== top.nameKo && (
            <p className="mt-0.5 text-sm text-[#5A8296]" lang="ko">
              {top.nameKo}
            </p>
          )}
          {top.romanized && (
            <p className="mt-0.5 font-mono text-xs uppercase tracking-wide text-[#6B8FA3]">
              {top.romanized}
            </p>
          )}
        </div>
        <span className="font-mono text-xs text-[#6B8FA3]">
          {Math.round(top.confidence * 100)}%
        </span>
      </div>

      {/* CTA based on confidence */}
      <div className="mt-4">
        {(action === "navigate" || action === "confirm") && (
          <Link
            href={`/${locale}/place/${top.placeId}`}
            className="inline-flex items-center gap-2 rounded-lg bg-[#0077B6] px-5 py-2.5
                       text-sm font-medium text-white transition-colors
                       hover:bg-[#005F92]"
          >
            {top.nameLocalized || top.nameKo}
            <span aria-hidden="true">&rarr;</span>
          </Link>
        )}
      </div>

      {/* Nearby places: shown when confirm has additional matches */}
      {action === "confirm" && matches.length > 1 && (
        <div className="mt-3 border-t border-[rgba(0,50,80,0.1)] pt-3">
          <p className="text-xs text-[#6B8FA3]">{dict.nearbyPlaces}</p>
          <ul className="mt-2 space-y-1">
            {matches.slice(1).map((m) => (
              <li key={m.placeId}>
                <Link
                  href={`/${locale}/place/${m.placeId}`}
                  className="flex items-center justify-between rounded-lg px-3 py-2
                             text-sm text-[#1B3A4B] transition-colors
                             hover:bg-[rgba(0,119,182,0.06)]"
                >
                  <span>
                    <span className="font-medium text-[#0A2540]">
                      {m.nameLocalized || m.nameKo}
                    </span>
                    {m.nameLocalized && m.nameLocalized !== m.nameKo && (
                      <span className="ml-2 text-[#5A8296]">{m.nameKo}</span>
                    )}
                  </span>
                  <span aria-hidden="true" className="text-[#6B8FA3]">&rarr;</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Disambiguate: multiple candidates */}
      {action === "disambiguate" && matches.length > 1 && (
        <div className="mt-3 border-t border-[rgba(0,50,80,0.1)] pt-3">
          <p className="text-xs text-[#6B8FA3]">{dict.didYouMean}</p>
          <ul className="mt-2 space-y-1">
            {matches.map((m) => (
              <li key={m.placeId}>
                <Link
                  href={`/${locale}/place/${m.placeId}`}
                  className="flex items-center justify-between rounded-lg px-3 py-2
                             text-sm text-[#1B3A4B] transition-colors
                             hover:bg-[rgba(0,119,182,0.06)]"
                >
                  <span>
                    <span className="font-medium text-[#0A2540]">
                      {m.nameLocalized || m.nameKo}
                    </span>
                    {m.nameLocalized && m.nameLocalized !== m.nameKo && (
                      <span className="ml-2 text-[#5A8296]">{m.nameKo}</span>
                    )}
                  </span>
                  <span className="font-mono text-xs text-[#6B8FA3]">
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
