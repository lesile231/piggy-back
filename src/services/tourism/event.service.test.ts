import { describe, it, expect, vi } from "vitest";
import { EventService } from "./event.service";
import type { EventRepository } from "./event.repository";
import type { EventRecord } from "./types";

const MOCK_EVENT: EventRecord = {
  id: "event-1",
  nameKo: "부산국제영화제",
  names: { en: "Busan International Film Festival", ko: "부산국제영화제" },
  description: { en: "One of Asia's most prestigious film festivals." },
  category: "festival",
  venueName: { en: "Busan Cinema Center" },
  addressKo: "부산시 해운대구",
  latitude: 35.1586,
  longitude: 129.1604,
  startsAt: new Date("2026-10-01"),
  endsAt: new Date("2026-10-10"),
  priceInfo: { en: "Free screenings available" },
  bookingUrl: "https://biff.kr",
  images: [],
  source: "manual",
  isActive: true,
};

function createMockEventRepo(results: EventRecord[] = [MOCK_EVENT]): EventRepository {
  return {
    getActiveEvents: vi.fn().mockResolvedValue(results),
    getById: vi.fn().mockResolvedValue(results[0] ?? null),
  } as unknown as EventRepository;
}

describe("EventService", () => {
  it("returns formatted event list", async () => {
    const repo = createMockEventRepo();
    const service = new EventService(repo);

    const messages = await service.searchEvents({}, "en");

    expect(messages.length).toBeGreaterThan(0);
    expect(messages[0]!.text).toContain("Busan International Film Festival");
  });

  it("includes booking URL when available", async () => {
    const repo = createMockEventRepo();
    const service = new EventService(repo);

    const messages = await service.searchEvents({}, "en");
    const text = messages.map((m) => m.text).join(" ");

    expect(text).toContain("biff.kr");
  });

  it("returns 'no events' message when empty", async () => {
    const repo = createMockEventRepo([]);
    const service = new EventService(repo);

    const messages = await service.searchEvents({}, "en");

    expect(messages.length).toBe(1);
    expect(messages[0]!.type).toBe("text");
  });

  it("passes date and category filters to repository", async () => {
    const repo = createMockEventRepo();
    const service = new EventService(repo);
    const date = new Date("2026-10-05");

    await service.searchEvents({ date, category: "festival" }, "en");

    expect(repo.getActiveEvents).toHaveBeenCalledWith({
      date,
      category: "festival",
    });
  });
});
