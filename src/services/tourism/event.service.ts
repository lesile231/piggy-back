import type { EventRepository } from "./event.repository";
import type { OutgoingMessage } from "@/services/bot/types";
import { localize } from "@/types/common";

export class EventService {
  constructor(private eventRepo: EventRepository) {}

  async searchEvents(
    options: { date?: Date; category?: string },
    language: string,
  ): Promise<OutgoingMessage[]> {
    const events = await this.eventRepo.getActiveEvents({
      date: options.date,
      category: options.category,
    });

    if (events.length === 0) {
      return [{
        type: "text",
        text: localize(
          {
            en: "No events found for the selected criteria.",
            ko: "선택한 조건에 맞는 이벤트를 찾을 수 없습니다.",
            ja: "選択した条件に一致するイベントが見つかりませんでした。",
            zh: "未找到符合条件的活动。",
          },
          language,
        ),
      }];
    }

    const header = localize(
      {
        en: `Found ${events.length} event(s):`,
        ko: `${events.length}개의 이벤트를 찾았습니다:`,
        ja: `${events.length}件のイベントが見つかりました:`,
        zh: `找到${events.length}个活动:`,
      },
      language,
    );

    const eventTexts = events.map((event) => {
      const name = localize(event.names, language) || event.nameKo;
      const desc = localize(event.description, language);
      const venue = localize(event.venueName, language);
      const dateRange = `${event.startsAt.toLocaleDateString()} - ${event.endsAt.toLocaleDateString()}`;

      const parts = [`📅 ${name}`, `   ${dateRange}`];
      if (venue) parts.push(`   📍 ${venue}`);
      if (desc) parts.push(`   ${desc}`);
      if (event.bookingUrl) parts.push(`   🔗 ${event.bookingUrl}`);

      return parts.join("\n");
    });

    return [{
      type: "text",
      text: `${header}\n\n${eventTexts.join("\n\n")}`,
    }];
  }
}
