import type { ResolutionAction, ResolutionMatch } from "@/types/ai";

const NAVIGATE_THRESHOLD = 0.9;
const CONFIRM_THRESHOLD = 0.6;

/**
 * §4.2 신뢰도별 분기 — matches 배열로부터 UI action을 결정한다.
 *
 * | 조건                         | action        |
 * |-----------------------------|---------------|
 * | 후보 없음                     | "empty"       |
 * | ≥ 0.9, 단일 후보              | "navigate"    |
 * | ≥ 0.6                       | "confirm"     |
 * | < 0.6                       | "disambiguate"|
 */
export function determineAction(matches: ResolutionMatch[]): ResolutionAction {
  if (matches.length === 0) return "empty";

  const top = matches[0];
  if (!top) return "empty";
  const topConfidence = top.confidence;

  if (topConfidence >= NAVIGATE_THRESHOLD && matches.length === 1) {
    return "navigate";
  }

  if (topConfidence >= CONFIRM_THRESHOLD) {
    return "confirm";
  }

  return "disambiguate";
}
