import type { TourismProvider, TourismSpotExternal } from "./types";

const MOCK_SPOTS: TourismSpotExternal[] = [
  {
    externalId: "mock-haeundae",
    names: { en: "Haeundae Beach", ko: "해운대해수욕장", ja: "海雲台ビーチ", zh: "海云台海水浴场" },
    description: {
      en: "Busan's most famous beach with white sand and beautiful coastline.",
      ko: "부산에서 가장 유명한 해수욕장으로 하얀 모래와 아름다운 해안선이 특징입니다.",
    },
    address: { en: "264 Haeundaehaebyeon-ro, Haeundae-gu, Busan", ko: "부산 해운대구 해운대해변로 264" },
    latitude: 35.1586,
    longitude: 129.1604,
    category: "beach",
    rating: 4.5,
    images: ["https://example.com/haeundae.jpg"],
  },
  {
    externalId: "mock-gamcheon",
    names: { en: "Gamcheon Culture Village", ko: "감천문화마을", ja: "甘川文化村", zh: "甘川文化村" },
    description: {
      en: "Colorful hillside village known as the 'Machu Picchu of Busan'.",
      ko: "부산의 마추픽추로 불리는 알록달록한 언덕 마을입니다.",
    },
    address: { en: "203 Gamnae 2-ro, Saha-gu, Busan", ko: "부산 사하구 감내2로 203" },
    latitude: 35.0975,
    longitude: 129.0088,
    category: "landmark",
    rating: 4.3,
    images: ["https://example.com/gamcheon.jpg"],
  },
  {
    externalId: "mock-jagalchi",
    names: { en: "Jagalchi Market", ko: "자갈치시장", ja: "チャガルチ市場", zh: "札嘎其市场" },
    description: {
      en: "Korea's largest seafood market, famous for fresh fish and local cuisine.",
      ko: "한국 최대의 수산시장으로 신선한 해산물과 지역 음식으로 유명합니다.",
    },
    address: { en: "52 Jagalchihaean-ro, Jung-gu, Busan", ko: "부산 중구 자갈치해안로 52" },
    latitude: 35.0968,
    longitude: 129.0306,
    category: "market",
    rating: 4.2,
    images: ["https://example.com/jagalchi.jpg"],
  },
  {
    externalId: "mock-yonggungsa",
    names: { en: "Haedong Yonggungsa Temple", ko: "해동용궁사", ja: "海東龍宮寺", zh: "海东龙宫寺" },
    description: {
      en: "Stunning seaside Buddhist temple perched on the cliffs of Busan's coast.",
      ko: "부산 해안 절벽 위에 자리한 아름다운 해안 사찰입니다.",
    },
    address: { en: "86 Yonggung-gil, Gijang-gun, Busan", ko: "부산 기장군 용궁길 86" },
    latitude: 35.1884,
    longitude: 129.2233,
    category: "temple",
    rating: 4.6,
    images: ["https://example.com/yonggungsa.jpg"],
  },
  {
    externalId: "mock-biff",
    names: { en: "BIFF Square", ko: "BIFF 광장", ja: "BIFF広場", zh: "BIFF广场" },
    description: {
      en: "Iconic street named after Busan International Film Festival, famous for street food.",
      ko: "부산국제영화제의 이름을 딴 거리로 길거리 음식으로 유명합니다.",
    },
    address: { en: "BIFF Square, Nampo-dong, Jung-gu, Busan", ko: "부산 중구 남포동 BIFF광장" },
    latitude: 35.0991,
    longitude: 129.0280,
    category: "entertainment",
    rating: 4.0,
    images: ["https://example.com/biff.jpg"],
  },
];

export class MockTourismProvider implements TourismProvider {
  async searchSpots(
    query: string,
    options?: { category?: string; limit?: number; language?: string },
  ): Promise<TourismSpotExternal[]> {
    let results = [...MOCK_SPOTS];

    if (query) {
      const q = query.toLowerCase();
      results = results.filter(
        (s) =>
          Object.values(s.names).some((n) => n.toLowerCase().includes(q)) ||
          s.category.toLowerCase().includes(q),
      );
    }

    if (options?.category) {
      results = results.filter((s) => s.category === options.category);
    }

    if (options?.limit) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  async getSpotDetail(externalId: string): Promise<TourismSpotExternal | null> {
    return MOCK_SPOTS.find((s) => s.externalId === externalId) ?? null;
  }
}
