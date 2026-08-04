import { describe, it, expect, vi } from "vitest";
import { MenuService } from "./menu.service";
import type { FlowRepository } from "./flow/flow.repository";

describe("MenuService", () => {
  it("returns buttons message with active flows", async () => {
    const mockRepo = {
      getActiveFlows: vi.fn().mockResolvedValue([
        { id: "f1", name: "transit", icon: "🗺", displayNames: { en: "Find Route", ja: "経路検索" }, sortOrder: 1 },
        { id: "f2", name: "tourism", icon: "🏖", displayNames: { en: "Tourist Spots", ja: "観光地" }, sortOrder: 2 },
      ]),
    } as unknown as FlowRepository;

    const service = new MenuService(mockRepo);
    const menu = await service.getMainMenu("en");

    expect(menu.type).toBe("buttons");
    expect(menu.buttons).toHaveLength(3); // 2 flows + 1 free chat
    expect(menu.buttons![0]!.label).toContain("Find Route");
    expect(menu.buttons![2]!.id).toBe("__free_chat__");
  });

  it("always includes free chat option", async () => {
    const mockRepo = {
      getActiveFlows: vi.fn().mockResolvedValue([]),
    } as unknown as FlowRepository;

    const service = new MenuService(mockRepo);
    const menu = await service.getMainMenu("ja");

    expect(menu.buttons).toHaveLength(1);
    expect(menu.buttons![0]!.id).toBe("__free_chat__");
  });

  it("localizes flow names to requested language", async () => {
    const mockRepo = {
      getActiveFlows: vi.fn().mockResolvedValue([
        { id: "f1", name: "transit", icon: "🗺", displayNames: { en: "Find Route", ja: "経路検索" }, sortOrder: 1 },
      ]),
    } as unknown as FlowRepository;

    const service = new MenuService(mockRepo);
    const menu = await service.getMainMenu("ja");

    expect(menu.buttons![0]!.label).toContain("経路検索");
  });
});
