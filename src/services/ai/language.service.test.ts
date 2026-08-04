import { describe, it, expect } from "vitest";
import { LanguageService } from "./language.service";

describe("LanguageService", () => {
  const service = new LanguageService();

  it("detects English text", () => {
    const result = service.detect("Where is the best beach in Busan?");
    expect(result.language).toBe("en");
  });

  it("detects Japanese text", () => {
    const result = service.detect("釜山で一番おいしいレストランはどこですか？");
    expect(result.language).toBe("ja");
  });

  it("detects Chinese text", () => {
    const result = service.detect("釜山最好的海滩在哪里？");
    expect(result.language).toBe("zh");
  });

  it("returns fallback for very short text", () => {
    const result = service.resolveLanguage("hi", "ja");
    expect(result).toBe("ja"); // too short to detect, use session language
  });

  it("returns 'en' when no session language and detection fails", () => {
    const result = service.resolveLanguage("👋");
    expect(result).toBe("en");
  });
});
