import type { SpotRepository } from "./spot.repository";
import type { TourismProvider } from "@/lib/external/tourism/types";
import type { LocationResolver } from "@/services/ai/location-resolver";
import type { OutgoingMessage } from "@/services/bot/types";
import type { SpotRecord } from "./types";
import { localize } from "@/types/common";

const MIN_DB_RESULTS = 3;

export class TourismService {
  constructor(
    private spotRepo: SpotRepository,
    private providers: TourismProvider[],
    private locationResolver: LocationResolver,
  ) {}

  async searchSpots(
    query: string,
    language: string,
    category?: string,
  ): Promise<OutgoingMessage[]> {
    // 1. Search DB first
    let spots: SpotRecord[];
    if (category) {
      spots = await this.spotRepo.searchByCategory(category);
    } else {
      spots = await this.spotRepo.searchByName(query);
    }

    // 2. If insufficient results, query external providers
    if (spots.length < MIN_DB_RESULTS) {
      for (const provider of this.providers) {
        try {
          const externalSpots = await provider.searchSpots(query, {
            category,
            limit: 5,
            language,
          });

          // Cache external results in DB
          for (const ext of externalSpots) {
            try {
              const cached = await this.spotRepo.upsertFromExternal(ext, "external_api");
              if (!spots.find((s) => s.id === cached.id)) {
                spots.push(cached);
              }
            } catch {
              // Non-critical: skip if caching fails
            }
          }

          if (spots.length >= MIN_DB_RESULTS) break;
        } catch {
          // Try next provider
        }
      }
    }

    if (spots.length === 0) {
      return [{
        type: "text",
        text: localize(
          {
            en: `No spots found for "${query}". Try a different search term.`,
            ko: `"${query}"에 대한 관광지를 찾을 수 없습니다. 다른 검색어를 시도해 주세요.`,
            ja: `「${query}」に関する観光スポットが見つかりませんでした。別の検索語をお試しください。`,
            zh: `未找到"${query}"相关的景点。请尝试其他搜索词。`,
          },
          language,
        ),
      }];
    }

    // 3. Format as buttons message
    return [{
      type: "buttons",
      text: localize(
        {
          en: `Found ${spots.length} spot(s):`,
          ko: `${spots.length}개의 관광지를 찾았습니다:`,
          ja: `${spots.length}件のスポットが見つかりました:`,
          zh: `找到${spots.length}个景点:`,
        },
        language,
      ),
      buttons: spots.slice(0, 5).map((s) => ({
        id: `spot_detail:${s.id}`,
        label: localize(s.names, language) || s.nameKo,
      })),
    }];
  }

  async getSpotDetail(spotId: string, language: string): Promise<OutgoingMessage[]> {
    const spot = await this.spotRepo.getById(spotId);
    if (!spot) {
      return [{
        type: "text",
        text: localize(
          {
            en: "Spot not found.",
            ko: "관광지를 찾을 수 없습니다.",
            ja: "スポットが見つかりませんでした。",
            zh: "未找到景点。",
          },
          language,
        ),
      }];
    }

    const name = localize(spot.names, language) || spot.nameKo;
    const desc = localize(spot.description, language);
    const addr = localize(spot.addresses, language) || spot.addressKo || "";

    const parts = [name, ""];
    if (desc) parts.push(desc, "");
    if (addr) {
      const addrLabel = localize({ en: "Address", ko: "주소", ja: "住所", zh: "地址" }, language);
      parts.push(`📍 ${addrLabel}: ${addr}`);
    }
    if (spot.rating) {
      parts.push(`⭐ ${spot.rating}/5`);
    }
    if (spot.phone) {
      parts.push(`📞 ${spot.phone}`);
    }
    if (spot.website) {
      parts.push(`🌐 ${spot.website}`);
    }

    const messages: OutgoingMessage[] = [{ type: "text", text: parts.join("\n") }];

    if (spot.latitude && spot.longitude) {
      messages.push({
        type: "location",
        location: { latitude: spot.latitude, longitude: spot.longitude, label: name },
      });
    }

    return messages;
  }
}
