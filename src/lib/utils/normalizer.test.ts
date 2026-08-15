import { describe, it, expect } from "vitest";
import { normalize } from "./normalizer";

describe("normalize", () => {
  it("lowercases ASCII", () => {
    expect(normalize("HAEUNDAE")).toBe("haeundae");
    expect(normalize("Haeundae")).toBe("haeundae");
  });

  it("strips spaces and hyphens", () => {
    expect(normalize("hae un dae")).toBe("haeundae");
    expect(normalize("Hae-un-dae")).toBe("haeundae");
    expect(normalize("hae_un_dae")).toBe("haeundae");
  });

  it("strips apostrophes and periods", () => {
    expect(normalize("Tae'jong.dae")).toBe("taejongdae");
  });

  it("removes diacritical marks via NFD", () => {
    expect(normalize("café")).toBe("cafe");
    expect(normalize("naïve")).toBe("naive");
    expect(normalize("Haeundaé")).toBe("haeundae");
  });

  it("converts fullwidth ASCII to halfwidth", () => {
    // ｈａｅｕｎｄａｅ (fullwidth Latin)
    expect(normalize("\uff48\uff41\uff45\uff55\uff4e\uff44\uff41\uff45")).toBe(
      "haeundae",
    );
  });

  it("passes CJK characters through unchanged", () => {
    expect(normalize("해운대")).toBe("해운대");
    expect(normalize("ヘウンデ")).toBe("ヘウンデ");
    expect(normalize("海云台")).toBe("海云台");
    expect(normalize("海雲台")).toBe("海雲台");
  });

  it("handles mixed scripts", () => {
    expect(normalize("gamcheon culture village")).toBe(
      "gamcheonculturevillage",
    );
    expect(normalize("Gamchon Culture Village")).toBe(
      "gamchonculturevillage",
    );
  });

  it("handles empty and whitespace-only input", () => {
    expect(normalize("")).toBe("");
    expect(normalize("   ")).toBe("");
  });

  it("strips middle dots (·)", () => {
    expect(normalize("busan·tower")).toBe("busantower");
  });
});
