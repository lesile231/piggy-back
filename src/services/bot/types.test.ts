import { describe, it, expect } from "vitest";
import type {
  IncomingMessage, OutgoingMessage, PlatformConstraints, SessionMode,
} from "./types";

describe("bot types", () => {
  it("IncomingMessage satisfies text message shape", () => {
    const msg: IncomingMessage = {
      platform: "whatsapp",
      platformMessageId: "msg-1",
      chatId: "chat-1",
      userId: "user-1",
      type: "text",
      text: "hello",
      timestamp: new Date(),
      raw: {},
    };
    expect(msg.type).toBe("text");
    expect(msg.text).toBe("hello");
  });

  it("OutgoingMessage satisfies buttons message shape", () => {
    const msg: OutgoingMessage = {
      type: "buttons",
      text: "Choose an option:",
      buttons: [
        { id: "opt-1", label: "Option 1" },
        { id: "opt-2", label: "Option 2" },
      ],
    };
    expect(msg.buttons).toHaveLength(2);
  });

  it("PlatformConstraints defines limits", () => {
    const constraints: PlatformConstraints = {
      maxTextLength: 4096,
      maxButtons: 3,
      supportsCarousel: false,
      supportsQuickReply: true,
    };
    expect(constraints.maxButtons).toBe(3);
  });

  it("SessionMode union includes all modes", () => {
    const modes: SessionMode[] = ["menu", "flow", "free_chat"];
    expect(modes).toHaveLength(3);
  });
});
