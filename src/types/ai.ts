export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMResponse {
  content: string;
  tokensUsed: { input: number; output: number };
  model: string;
  provider: string;
}

export interface ResolvedLocation {
  spotId: string;
  spotName: string;
  confidence: number;
  source: "alias" | "embedding" | "gpt";
}

/** §4.2 응답 계약 — 해석 엔진 응답 타입 */
export type ResolutionStage = 1 | 2 | 3 | 4 | 5;

/**
 * §4.2 신뢰도별 UI 분기 액션.
 * - navigate:     ≥ 0.9 + 단일 후보 → 결과 페이지로 바로 이동
 * - confirm:      ≥ 0.6           → 환적 스트립에 표시 + 확인 대기
 * - disambiguate: < 0.6           → "이거 말씀하신 건가요?" 후보 목록 제시
 * - empty:        후보 없음        → §5.5 빈 상태
 */
export type ResolutionAction = "navigate" | "confirm" | "disambiguate" | "empty";

export interface ResolutionMatch {
  placeId: string;
  nameKo: string;
  nameLocalized: string;
  romanized: string;
  confidence: number;
  /** Coordinates (internal use for nearby enrichment, not serialized to client) */
  latitude?: number;
  longitude?: number;
}

export interface Resolution {
  query: string;
  normalizedQuery: string;
  detectedLang: string;
  stage: ResolutionStage | null;
  action: ResolutionAction;
  matches: ResolutionMatch[];
}

/**
 * §6.1 Bot intents.
 * - resolve_place: place name in any language → resolution + /place/{id} link
 * - how_to_get:    "how do I get there" → transit summary + map deep link
 * - whats_on:      "what's happening" → top 3 current events + /events link
 * - nearby:        "near me" → request coordinates → 5 nearby POIs
 * - fallback:      everything else → show 4 intent buttons
 * - greeting:      greetings, thanks, goodbyes (canned response)
 * - off_topic:     unrelated to Busan tourism (redirect)
 */
export type Intent =
  | "resolve_place"
  | "how_to_get"
  | "whats_on"
  | "nearby"
  | "fallback"
  | "greeting"
  | "off_topic";

export interface ClassificationResult {
  intent: Intent;
  confidence: number;
  extractedEntities?: {
    location?: string;
    category?: string;
    date?: string;
  };
}
