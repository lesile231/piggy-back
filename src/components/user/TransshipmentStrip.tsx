"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useResolve } from "@/lib/hooks/use-resolve";
import { Button } from "@/components/ui/Button";
import type { Resolution, ResolutionMatch } from "@/types/ai";

interface TransshipmentStripProps {
  locale: string;
  dict: {
    emptyState: string;
    networkError: string;
    retry: string;
    didYouMean: string;
  };
  popularChips: { label: string; query: string }[];
}

/**
 * §5.4 시그니처 요소 — 환적 스트립.
 *
 * Displays real-time resolution results below the search input.
 * - IN row: user query + detected language badge
 * - OUT row: Korean name with character-by-character reveal animation
 * - Multi-locale names in steel color
 * - prefers-reduced-motion: instant display
 */
export function TransshipmentStrip({
  locale,
  dict,
  popularChips,
}: TransshipmentStripProps) {
  const { resolution, isLoading, error, resolve, clear } = useResolve({
    lang: locale,
  });
  const [query, setQuery] = useState("");

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    if (value.trim()) {
      resolve(value);
    } else {
      clear();
    }
  };

  const handleRetry = () => {
    if (query.trim()) {
      resolve(query);
    }
  };

  const showStrip = query.trim().length > 0;

  return (
    <div className="w-full max-w-xl mx-auto">
      {/* Search input — hero element, no auto-focus per §3.1 */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleInput}
          placeholder="hey oon day"
          className="w-full rounded-xl border border-zinc-300 bg-white px-5 py-4 text-lg
                     focus:border-zinc-500 focus:outline-none
                     dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
        />
        {isLoading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
          </div>
        )}
      </div>

      {/* Strip area */}
      {showStrip && (
        <div
          className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 px-5 py-4
                      dark:border-zinc-700 dark:bg-zinc-800/50"
        >
          {error ? (
            <ErrorState
              message={dict.networkError}
              retryLabel={dict.retry}
              onRetry={handleRetry}
            />
          ) : resolution ? (
            <StripResult
              resolution={resolution}
              locale={locale}
              dict={dict}
              popularChips={popularChips}
            />
          ) : isLoading ? (
            <StripPlaceholder />
          ) : null}
        </div>
      )}
    </div>
  );
}

/* ── IN / OUT result display ── */

function StripResult({
  resolution,
  locale,
  dict,
  popularChips,
}: {
  resolution: Resolution;
  locale: string;
  dict: TransshipmentStripProps["dict"];
  popularChips: TransshipmentStripProps["popularChips"];
}) {
  const { action, matches, query, detectedLang } = resolution;

  if (action === "empty") {
    return (
      <EmptyState
        message={dict.emptyState}
        chips={popularChips}
        locale={locale}
      />
    );
  }

  const top = matches[0];
  if (!top) {
    return (
      <EmptyState
        message={dict.emptyState}
        chips={popularChips}
        locale={locale}
      />
    );
  }

  return (
    <div>
      {/* IN row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
            in
          </span>
          <span className="text-sm text-zinc-600 dark:text-zinc-300">
            {query}
          </span>
        </div>
        <LangBadge lang={detectedLang} />
      </div>

      {/* Divider */}
      <div className="my-2 border-t border-zinc-200 dark:border-zinc-700" />

      {/* OUT row */}
      <div>
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
            out
          </span>
          <KoreanReveal
            text={top.nameKo}
            placeId={top.placeId}
            locale={locale}
            action={action}
          />
        </div>

        {/* Multi-locale names */}
        <MultiLocaleNames match={top} locale={locale} />
      </div>

      {/* Disambiguate: show candidates */}
      {action === "disambiguate" && matches.length > 1 && (
        <div className="mt-3 border-t border-zinc-200 pt-3 dark:border-zinc-700">
          <p className="text-xs text-zinc-500">{dict.didYouMean}</p>
          <ul className="mt-2 space-y-1">
            {matches.map((m) => (
              <li key={m.placeId}>
                <Link
                  href={`/${locale}/place/${m.placeId}`}
                  className="flex items-center justify-between rounded-lg px-3 py-2 text-sm
                             hover:bg-zinc-100 dark:hover:bg-zinc-700/50"
                >
                  <span>
                    <span className="font-medium">{m.nameLocalized || m.nameKo}</span>
                    {m.nameLocalized && m.nameLocalized !== m.nameKo && (
                      <span className="ml-2 text-zinc-500">{m.nameKo}</span>
                    )}
                  </span>
                  <span className="text-xs text-zinc-400">
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

/* ── Korean name with character reveal animation ── */

function KoreanReveal({
  text,
  placeId,
  locale,
  action,
}: {
  text: string;
  placeId: string;
  locale: string;
  action: string;
}) {
  const [visibleCount, setVisibleCount] = useState(0);
  const prevTextRef = useRef("");
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    // Only animate when text changes
    if (text === prevTextRef.current) return;
    prevTextRef.current = text;

    if (prefersReducedMotion) {
      setVisibleCount(text.length);
      return;
    }

    setVisibleCount(0);
    const charDelay = Math.min(24, 200 / text.length); // 24ms/char, max 200ms total
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setVisibleCount(i);
      if (i >= text.length) clearInterval(interval);
    }, charDelay);

    return () => clearInterval(interval);
  }, [text, prefersReducedMotion]);

  const revealed = text.slice(0, visibleCount);
  const hidden = text.slice(visibleCount);

  const content = (
    <span className="text-xl font-semibold text-orange-500 dark:text-orange-400" lang="ko">
      {revealed}
      {hidden && (
        <span className="invisible">{hidden}</span>
      )}
    </span>
  );

  if (action === "navigate" || action === "confirm") {
    return (
      <Link href={`/${locale}/place/${placeId}`} className="hover:underline">
        {content}
      </Link>
    );
  }

  return content;
}

/* ── Multi-locale names ── */

function MultiLocaleNames({
  match,
  locale,
}: {
  match: ResolutionMatch;
  locale: string;
}) {
  // Build locale display names from the match
  const parts: string[] = [];
  if (match.romanized && locale !== "en") parts.push(match.romanized.toUpperCase());
  if (match.nameLocalized && match.nameLocalized !== match.nameKo) {
    parts.push(match.nameLocalized);
  }

  if (parts.length === 0) return null;

  return (
    <p className="ml-7 mt-0.5 text-sm text-zinc-400 dark:text-zinc-500">
      {parts.join("   ")}
    </p>
  );
}

/* ── Language badge with fade-in ── */

function LangBadge({ lang }: { lang: string }) {
  return (
    <span
      className="animate-fade-in rounded bg-zinc-200 px-2 py-0.5 text-xs font-mono
                 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"
    >
      {lang}
    </span>
  );
}

/* ── Placeholder (loading state) ── */

function StripPlaceholder() {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
          in
        </span>
        <div className="h-4 w-32 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
      </div>
      <div className="border-t border-dashed border-zinc-300 dark:border-zinc-600" />
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
          out
        </span>
        <div className="h-5 w-24 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
      </div>
    </div>
  );
}

/* ── Empty state per §5.5 ── */

function EmptyState({
  message,
  chips,
  locale,
}: {
  message: string;
  chips: { label: string; query: string }[];
  locale: string;
}) {
  return (
    <div>
      <p className="text-sm text-zinc-500">{message}</p>
      {chips.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {chips.slice(0, 6).map((chip) => (
            <Link
              key={chip.query}
              href={`/${locale}/place/${chip.query}`}
              className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-medium
                         text-zinc-600 hover:bg-zinc-100
                         dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              {chip.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Error state per §5.5 ── */

function ErrorState({
  message,
  retryLabel,
  onRetry,
}: {
  message: string;
  retryLabel: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-zinc-500">{message}</p>
      <Button variant="secondary" size="sm" onClick={onRetry}>
        {retryLabel}
      </Button>
    </div>
  );
}

/* ── prefers-reduced-motion hook ── */

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
