/**
 * §6.1 Intent Router — maps classified intents to service actions.
 *
 * | Intent        | Service                          | Response                              |
 * |---------------|----------------------------------|---------------------------------------|
 * | resolve_place | LocationResolver                 | Resolution result + /place/{id} link  |
 * | how_to_get    | LocationResolver                 | Map deep links (Google, Naver, Kakao) |
 * | whats_on      | EventRepository                  | Top 3 events + /events link           |
 * | nearby        | SpotRepository.searchNearby      | Request coordinates → 5 nearby POIs   |
 * | fallback      | —                                | Show 4 intent quick-reply buttons     |
 */
import type { LocationResolver } from "./location-resolver";
import type { EventRepository } from "@/services/tourism/event.repository";
import type { SpotRepository } from "@/services/tourism/spot.repository";
import type { OutgoingMessage } from "@/services/bot/types";
import type { ClassificationResult } from "@/types/ai";
import { localize } from "@/types/common";

export interface IntentRouterDeps {
  locationResolver: LocationResolver;
  eventRepo: EventRepository;
  spotRepo: SpotRepository;
  appUrl: string;
}

export class IntentRouter {
  constructor(private deps: IntentRouterDeps) {}

  async route(
    intent: ClassificationResult,
    message: string,
    language: string,
    userLocation?: { latitude: number; longitude: number },
  ): Promise<OutgoingMessage[]> {
    switch (intent.intent) {
      case "resolve_place":
        return this.handleResolvePlace(
          intent.extractedEntities?.location ?? message,
          language,
        );
      case "how_to_get":
        return this.handleHowToGet(
          intent.extractedEntities?.location ?? message,
          language,
        );
      case "whats_on":
        return this.handleWhatsOn(language);
      case "nearby":
        return this.handleNearby(language, userLocation);
      case "fallback":
      default:
        return this.handleFallback(language);
    }
  }

  private async handleResolvePlace(
    query: string,
    language: string,
  ): Promise<OutgoingMessage[]> {
    const resolution = await this.deps.locationResolver.resolve(
      query,
      language,
    );

    if (resolution.matches.length === 0) {
      return [{
        type: "text",
        text: localize({
          en: `I couldn't find a place called "${query}". Try a different name or check the spelling.`,
          ko: `"${query}"라는 장소를 찾을 수 없습니다. 다른 이름이나 철자를 확인해 주세요.`,
          ja: `「${query}」という場所が見つかりませんでした。別の名前やスペルをご確認ください。`,
          zh: `找不到名为"${query}"的地方。请尝试其他名称或检查拼写。`,
        }, language),
      }];
    }

    const top = resolution.matches[0]!;
    const placeUrl = `${this.deps.appUrl}/${language}/place/${top.placeId}`;

    if (resolution.matches.length === 1 || top.confidence >= 0.9) {
      return [{
        type: "text",
        text: `${top.nameLocalized} (${top.nameKo})\n\n${placeUrl}`,
      }];
    }

    // Multiple candidates — show as buttons
    return [{
      type: "buttons",
      text: localize({
        en: "Did you mean one of these?",
        ko: "혹시 이 중 하나를 찾으시나요?",
        ja: "こちらのいずれかですか？",
        zh: "您是指以下其中之一吗？",
      }, language),
      buttons: resolution.matches.slice(0, 4).map((m) => ({
        id: `place:${m.placeId}`,
        label: `${m.nameLocalized} (${m.nameKo})`,
      })),
    }];
  }

  private async handleHowToGet(
    query: string,
    language: string,
  ): Promise<OutgoingMessage[]> {
    const resolution = await this.deps.locationResolver.resolve(
      query,
      language,
    );

    if (resolution.matches.length === 0) {
      return [{
        type: "text",
        text: localize({
          en: `I couldn't find "${query}". Which place do you want directions to?`,
          ko: `"${query}"를 찾을 수 없습니다. 어디로 가는 길을 알려드릴까요?`,
          ja: `「${query}」が見つかりませんでした。どこへの行き方をお探しですか？`,
          zh: `找不到"${query}"。您想去哪里？`,
        }, language),
      }];
    }

    const top = resolution.matches[0]!;
    const spot = await this.deps.spotRepo.getById(top.placeId);

    if (!spot || !spot.latitude || !spot.longitude) {
      return [{
        type: "text",
        text: localize({
          en: `Found ${top.nameLocalized}, but location data is not available.`,
          ko: `${top.nameKo}을(를) 찾았지만 위치 정보가 없습니다.`,
          ja: `${top.nameLocalized}が見つかりましたが、位置情報がありません。`,
          zh: `找到了${top.nameLocalized}，但位置信息不可用。`,
        }, language),
      }];
    }

    const googleUrl = `https://www.google.com/maps/dir/?api=1&destination=${spot.latitude},${spot.longitude}`;
    const naverUrl = `https://map.naver.com/v5/directions/-/-/-/transit?c=${spot.longitude},${spot.latitude},15,0,0,0,dh`;
    const kakaoUrl = `https://map.kakao.com/link/to/${encodeURIComponent(top.nameKo)},${spot.latitude},${spot.longitude}`;

    const header = localize({
      en: `Directions to ${top.nameLocalized}:`,
      ko: `${top.nameKo} 가는 길:`,
      ja: `${top.nameLocalized}への行き方:`,
      zh: `前往${top.nameLocalized}的路线:`,
    }, language);

    return [
      {
        type: "text",
        text: `${header}\n\nGoogle Maps: ${googleUrl}\nNaver Map: ${naverUrl}\nKakao Map: ${kakaoUrl}`,
      },
      {
        type: "location",
        location: {
          latitude: spot.latitude,
          longitude: spot.longitude,
          label: top.nameLocalized,
        },
      },
    ];
  }

  private async handleWhatsOn(language: string): Promise<OutgoingMessage[]> {
    const [ongoing, upcoming] = await Promise.all([
      this.deps.eventRepo.getOngoingEvents(3),
      this.deps.eventRepo.getUpcomingEvents(3),
    ]);

    const events = [...ongoing, ...upcoming].slice(0, 3);

    if (events.length === 0) {
      return [{
        type: "text",
        text: localize({
          en: "No events are currently scheduled. Check back later!",
          ko: "현재 진행 중이거나 예정된 이벤트가 없습니다. 나중에 다시 확인해 주세요!",
          ja: "現在予定されているイベントはありません。後でまたチェックしてください！",
          zh: "目前没有活动。请稍后再查看！",
        }, language),
      }];
    }

    const eventLines = events.map((e) => {
      const name = localize(e.names, language) || e.nameKo;
      const dateRange = `${e.startsAt.toLocaleDateString(language, { month: "short", day: "numeric" })}–${e.endsAt.toLocaleDateString(language, { month: "short", day: "numeric" })}`;
      return `• ${name} (${dateRange})`;
    });

    const eventsUrl = `${this.deps.appUrl}/${language}/events`;
    const header = localize({
      en: "What's happening in Busan:",
      ko: "부산에서 진행 중인 행사:",
      ja: "釜山のイベント:",
      zh: "釜山正在举办的活动:",
    }, language);

    return [{
      type: "text",
      text: `${header}\n\n${eventLines.join("\n")}\n\n${localize({ en: "See all events", ko: "모든 이벤트 보기", ja: "すべてのイベントを見る", zh: "查看所有活动" }, language)}: ${eventsUrl}`,
    }];
  }

  private async handleNearby(
    language: string,
    userLocation?: { latitude: number; longitude: number },
  ): Promise<OutgoingMessage[]> {
    if (!userLocation) {
      return [{
        type: "text",
        text: localize({
          en: "Please share your location so I can find nearby spots!",
          ko: "가까운 관광지를 찾으려면 위치를 공유해 주세요!",
          ja: "近くのスポットを探すため、位置情報を共有してください！",
          zh: "请分享您的位置，以便我为您查找附近的景点！",
        }, language),
      }];
    }

    const spots = await this.deps.spotRepo.searchNearby(
      userLocation.latitude,
      userLocation.longitude,
      5,
    );

    if (spots.length === 0) {
      return [{
        type: "text",
        text: localize({
          en: "No tourist spots found near your location.",
          ko: "현재 위치 근처에 관광지를 찾을 수 없습니다.",
          ja: "お近くの観光スポットが見つかりませんでした。",
          zh: "在您附近未找到旅游景点。",
        }, language),
      }];
    }

    return [{
      type: "buttons",
      text: localize({
        en: "Spots near you:",
        ko: "가까운 관광지:",
        ja: "お近くのスポット:",
        zh: "附近的景点:",
      }, language),
      buttons: spots.slice(0, 5).map((s) => ({
        id: `place:${s.id}`,
        label: localize(s.names, language) || s.nameKo,
      })),
    }];
  }

  private handleFallback(language: string): OutgoingMessage[] {
    return [{
      type: "buttons",
      text: localize({
        en: "I'm Via Busan, your Busan travel assistant! What can I help with?",
        ko: "저는 Via Busan, 부산 여행 도우미입니다! 무엇을 도와드릴까요?",
        ja: "Via Busanです、釜山の旅行ガイドです！何をお手伝いしましょうか？",
        zh: "我是Via Busan，您的釜山旅行助手！有什么可以帮您的？",
      }, language),
      buttons: [
        {
          id: "intent:resolve_place",
          label: localize({ en: "Find a place", ko: "장소 찾기", ja: "場所を探す", zh: "查找地点" }, language),
        },
        {
          id: "intent:how_to_get",
          label: localize({ en: "Get directions", ko: "길 찾기", ja: "行き方を調べる", zh: "查找路线" }, language),
        },
        {
          id: "intent:whats_on",
          label: localize({ en: "What's on", ko: "행사 정보", ja: "イベント情報", zh: "活动信息" }, language),
        },
        {
          id: "intent:nearby",
          label: localize({ en: "Nearby spots", ko: "가까운 관광지", ja: "近くのスポット", zh: "附近景点" }, language),
        },
      ],
    }];
  }
}
