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
