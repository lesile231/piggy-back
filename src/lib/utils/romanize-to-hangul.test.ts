import { describe, it, expect } from "vitest";
import { romanizeToHangul } from "./romanize-to-hangul";

describe("romanizeToHangul", () => {
  it("converts basic RR romanization", () => {
    expect(romanizeToHangul("haeundae")).toBe("해운대");
  });

  it("converts with hyphens and spaces", () => {
    expect(romanizeToHangul("hae-un-dae")).toBe("해운대");
    expect(romanizeToHangul("hae un dae")).toBe("해운대");
  });

  it("converts gamcheon", () => {
    expect(romanizeToHangul("gamcheon")).toBe("감천");
  });

  it("converts jagalchi", () => {
    expect(romanizeToHangul("jagalchi")).toBe("자갈치");
  });

  it("converts gwangalli", () => {
    expect(romanizeToHangul("gwangalli")).toBe("광알리");
    // Note: "gwangalli" → 광알리, the actual name is 광안리 (gwanganli)
    // The alias dictionary handles the exact match; this tests the converter
  });

  it("converts gwanganli (correct RR for 광안리)", () => {
    expect(romanizeToHangul("gwanganli")).toBe("광안리");
  });

  it("converts taejongdae", () => {
    expect(romanizeToHangul("taejongdae")).toBe("태종대");
  });

  it("converts beomeosa", () => {
    // Deterministic parser: "m" before vowel "e" → 초성 of next syllable
    // Stage 4 jamo Levenshtein handles fuzzy match to 범어사
    expect(romanizeToHangul("beomeosa")).toBe("버머사");
  });

  it("converts yongdusan", () => {
    expect(romanizeToHangul("yongdusan")).toBe("용두산");
  });

  it("converts songjeong", () => {
    expect(romanizeToHangul("songjeong")).toBe("송정");
  });

  it("converts dongbaekseom", () => {
    expect(romanizeToHangul("dongbaekseom")).toBe("동백섬");
  });

  it("converts gukjesijang", () => {
    expect(romanizeToHangul("gukjesijang")).toBe("국제시장");
  });

  it("handles empty input", () => {
    expect(romanizeToHangul("")).toBe("");
  });

  it("handles pure Korean input (passes through nothing since no roman chars)", () => {
    // Korean characters don't match any romanization pattern, so they are skipped
    expect(romanizeToHangul("해운대")).toBe("");
  });

  it("converts haedong yonggungsa", () => {
    expect(romanizeToHangul("haedong yonggungsa")).toBe("해동용궁사");
  });

  it("converts dadaepo", () => {
    expect(romanizeToHangul("dadaepo")).toBe("다대포");
  });

  it("converts oryukdo", () => {
    expect(romanizeToHangul("oryukdo")).toBe("오륙도");
  });
});
