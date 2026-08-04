import type { LatLng } from "@/types/common";
import type { TransitProvider, TransitRoute } from "./types";

const MOCK_ROUTES: TransitRoute[] = [
  {
    summary: "Bus 1003 → Metro Line 1",
    duration: 55,
    distance: 18200,
    fare: 2650,
    steps: [
      {
        mode: "walk",
        instruction: { en: "Walk to Haeundae Station Bus Stop", ko: "해운대역 버스정류장까지 도보" },
        duration: 5,
        distance: 300,
      },
      {
        mode: "bus",
        instruction: { en: "Take Bus 1003 to Toseong Station", ko: "1003번 버스 토성역 하차" },
        duration: 35,
        distance: 14000,
        line: "1003",
        stops: 18,
        departureStop: "Haeundae Station",
        arrivalStop: "Toseong Station",
      },
      {
        mode: "walk",
        instruction: { en: "Walk to Gamcheon Culture Village", ko: "감천문화마을까지 도보" },
        duration: 15,
        distance: 900,
      },
    ],
    departureTime: new Date(),
    arrivalTime: new Date(Date.now() + 55 * 60 * 1000),
  },
  {
    summary: "Metro Line 2 → Bus 17",
    duration: 65,
    distance: 20100,
    fare: 2900,
    steps: [
      {
        mode: "walk",
        instruction: { en: "Walk to Haeundae Metro Station", ko: "해운대 지하철역까지 도보" },
        duration: 3,
        distance: 200,
      },
      {
        mode: "metro",
        instruction: { en: "Take Line 2 to Seomyeon, transfer to Line 1 to Toseong", ko: "2호선 서면역 환승, 1호선 토성역 하차" },
        duration: 40,
        distance: 16000,
        line: "Line 2 → Line 1",
        stops: 14,
        departureStop: "Haeundae",
        arrivalStop: "Toseong",
      },
      {
        mode: "walk",
        instruction: { en: "Walk to Gamcheon Culture Village", ko: "감천문화마을까지 도보" },
        duration: 15,
        distance: 900,
      },
    ],
    departureTime: new Date(),
    arrivalTime: new Date(Date.now() + 65 * 60 * 1000),
  },
];

export class MockTransitProvider implements TransitProvider {
  async searchRoutes(
    _from: LatLng,
    _to: LatLng,
    _options?: { departureTime?: Date; language?: string },
  ): Promise<TransitRoute[]> {
    return MOCK_ROUTES.map((route) => ({
      ...route,
      departureTime: new Date(),
      arrivalTime: new Date(Date.now() + route.duration * 60 * 1000),
    }));
  }
}
