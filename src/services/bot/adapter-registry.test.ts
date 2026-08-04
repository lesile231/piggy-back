import { describe, it, expect } from "vitest";
import { AdapterRegistry } from "./adapter-registry";
import type { BotAdapter } from "./adapter";

function createMockAdapter(platform: string): BotAdapter {
  return {
    platform: platform as "whatsapp",
    verifyWebhook: async () => true,
    parseIncoming: () => [],
    sendMessage: async () => {},
    sendTypingIndicator: async () => {},
    getConstraints: () => ({
      maxTextLength: 4096,
      maxButtons: 3,
      supportsCarousel: false,
      supportsQuickReply: true,
    }),
  };
}

describe("AdapterRegistry", () => {
  it("registers and retrieves adapter by platform", () => {
    const registry = new AdapterRegistry();
    const wa = createMockAdapter("whatsapp");
    registry.register(wa);

    expect(registry.get("whatsapp")).toBe(wa);
  });

  it("returns undefined for unregistered platform", () => {
    const registry = new AdapterRegistry();
    expect(registry.get("whatsapp")).toBeUndefined();
  });

  it("getAll returns all registered adapters", () => {
    const registry = new AdapterRegistry();
    registry.register(createMockAdapter("whatsapp"));
    registry.register(createMockAdapter("line"));

    expect(registry.getAll()).toHaveLength(2);
  });
});
