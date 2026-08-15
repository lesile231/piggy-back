import { describe, it, expect } from "vitest";
import { localize } from "@/types/common";

describe("Spot detail page", () => {
  it("localizes spot name correctly", () => {
    const spot = {
      names: { en: "Haeundae Beach", ko: "해운대해수욕장", ja: "海雲台ビーチ" },
      nameKo: "해운대해수욕장",
    };

    const nameEn = localize(spot.names, "en") || spot.nameKo;
    const nameKo = localize(spot.names, "ko") || spot.nameKo;
    const nameJa = localize(spot.names, "ja") || spot.nameKo;
    const nameZh = localize(spot.names, "zh") || spot.nameKo;

    expect(nameEn).toBe("Haeundae Beach");
    expect(nameKo).toBe("해운대해수욕장");
    expect(nameJa).toBe("海雲台ビーチ");
    expect(nameZh).toBe("Haeundae Beach"); // Falls back to "en" first, then nameKo
  });

  it("handles missing description gracefully", () => {
    const spot = {
      description: {} as Record<string, string>,
    };

    const description = localize(spot.description, "en");

    expect(description).toBe("");
  });

  it("handles missing address gracefully", () => {
    const spot = {
      addresses: {} as Record<string, string>,
      addressKo: null,
    };

    const address = localize(spot.addresses, "en") || spot.addressKo;

    expect(address).toBeNull();
  });

  it("formats rating to one decimal place", () => {
    const rating = 4.567;
    const formatted = rating.toFixed(1);

    expect(formatted).toBe("4.6");
  });

  it("slices images array to maximum of 4", () => {
    const images = ["img1.jpg", "img2.jpg", "img3.jpg", "img4.jpg", "img5.jpg"];
    const displayedImages = images.slice(0, 4);

    expect(displayedImages.length).toBe(4);
    expect(displayedImages).toEqual(["img1.jpg", "img2.jpg", "img3.jpg", "img4.jpg"]);
  });
});
