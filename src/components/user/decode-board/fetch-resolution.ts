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
