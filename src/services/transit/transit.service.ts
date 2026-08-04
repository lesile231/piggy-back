import type { TransitProvider, TransitRoute } from "@/lib/external/transit/types";
import type { LocationResolver } from "@/services/ai/location-resolver";
import type { TaxiService } from "./taxi.service";
import type { SpotRepository } from "@/services/tourism/spot.repository";
import type { OutgoingMessage } from "@/services/bot/types";
import { localize } from "@/types/common";
import type { LatLng } from "@/types/common";

export class TransitService {
  constructor(
    private providers: TransitProvider[],
    private locationResolver: LocationResolver,
    private taxiService: TaxiService,
    private spotRepo: SpotRepository,
  ) {}

  async searchRoute(
    from: string,
    to: string,
    language: string,
  ): Promise<OutgoingMessage[]> {
    // 1. Resolve locations
    const [fromResolved, toResolved] = await Promise.all([
      this.locationResolver.resolve(from, language),
      this.locationResolver.resolve(to, language),
    ]);

    if (!fromResolved || !toResolved) {
      const missing = !fromResolved ? from : to;
      return [{
        type: "text",
        text: localize(
          {
            en: `Sorry, I couldn't find the location "${missing}". Please try a different name.`,
            ko: `죄송합니다, "${missing}" 위치를 찾을 수 없습니다. 다른 이름으로 시도해 주세요.`,
            ja: `申し訳ありませんが、「${missing}」の場所が見つかりませんでした。別の名前をお試しください。`,
            zh: `抱歉,找不到"${missing}"的位置。请尝试其他名称。`,
          },
          language,
        ),
      }];
    }

    // 2. Get coordinates from spot records
    const [fromSpot, toSpot] = await Promise.all([
      this.spotRepo.getById(fromResolved.spotId),
      this.spotRepo.getById(toResolved.spotId),
    ]);

    if (!fromSpot?.latitude || !fromSpot?.longitude || !toSpot?.latitude || !toSpot?.longitude) {
      return [{
        type: "text",
        text: localize(
          {
            en: "Sorry, coordinates are not available for these locations.",
            ko: "죄송합니다, 해당 위치의 좌표 정보가 없습니다.",
            ja: "申し訳ありませんが、これらの場所の座標情報がありません。",
            zh: "抱歉,这些位置没有坐标信息。",
          },
          language,
        ),
      }];
    }

    const fromLatLng: LatLng = { latitude: fromSpot.latitude, longitude: fromSpot.longitude };
    const toLatLng: LatLng = { latitude: toSpot.latitude, longitude: toSpot.longitude };

    // 3. Try each provider in order
    let routes: TransitRoute[] = [];
    for (const provider of this.providers) {
      try {
        routes = await provider.searchRoutes(fromLatLng, toLatLng, { language });
        if (routes.length > 0) break;
      } catch {
        // Try next provider
      }
    }

    // 4. Format results or suggest taxi
    if (routes.length === 0) {
      const noRouteMsg: OutgoingMessage = {
        type: "text",
        text: localize(
          {
            en: "No transit routes found for this trip.",
            ko: "해당 경로의 대중교통 노선을 찾을 수 없습니다.",
            ja: "この経路の公共交通機関のルートが見つかりませんでした。",
            zh: "未找到该路线的公共交通路线。",
          },
          language,
        ),
      };
      const taxiMsg = this.taxiService.generateDeepLinks(fromLatLng, toLatLng, language);
      return [noRouteMsg, taxiMsg];
    }

    return this.formatRoutes(routes.slice(0, 3), language);
  }

  private formatRoutes(routes: TransitRoute[], language: string): OutgoingMessage[] {
    return routes.map((route, index) => {
      const header = localize(
        {
          en: `Route ${index + 1}: ${route.summary}`,
          ko: `경로 ${index + 1}: ${route.summary}`,
          ja: `ルート ${index + 1}: ${route.summary}`,
          zh: `路线 ${index + 1}: ${route.summary}`,
        },
        language,
      );

      const durationLabel = localize(
        { en: "Duration", ko: "소요시간", ja: "所要時間", zh: "所需时间" },
        language,
      );
      const fareLabel = localize(
        { en: "Fare", ko: "요금", ja: "料金", zh: "费用" },
        language,
      );

      const stepsText = route.steps
        .map((step) => {
          const icon = step.mode === "walk" ? "🚶" : step.mode === "bus" ? "🚌" : step.mode === "metro" ? "🚇" : "🚆";
          return `${icon} ${localize(step.instruction, language)} (${step.duration}min)`;
        })
        .join("\n");

      return {
        type: "text" as const,
        text: `${header}\n${durationLabel}: ${route.duration}min | ${fareLabel}: ₩${route.fare.toLocaleString()}\n\n${stepsText}`,
      };
    });
  }
}
