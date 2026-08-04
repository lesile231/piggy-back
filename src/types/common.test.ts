import { describe, it, expect } from "vitest";
import { ok, err, localize } from "./common";

describe("Result", () => {
  it("ok wraps data", () => {
    const result = ok(42);
    expect(result).toEqual({ ok: true, data: 42 });
  });

  it("err wraps error", () => {
    const result = err("NOT_FOUND", "missing");
    expect(result).toEqual({ ok: false, error: { code: "NOT_FOUND", message: "missing" } });
  });
});

describe("localize", () => {
  const text = { en: "Hello", ja: "こんにちは", zh: "你好" };

  it("returns matching language", () => {
    expect(localize(text, "ja")).toBe("こんにちは");
  });

  it("falls back to English", () => {
    expect(localize(text, "ko")).toBe("Hello");
  });

  it("falls back to first value if no English", () => {
    expect(localize({ ja: "テスト" }, "ko")).toBe("テスト");
  });

  it("returns empty string for empty object", () => {
    expect(localize({}, "en")).toBe("");
  });
});
