import { describe, it, expect, vi, beforeEach } from "vitest";
import { WhatsAppAdapter } from "./whatsapp.adapter";

const CONFIG = {
  phoneNumberId: "123456",
  accessToken: "test-token",
  verifyToken: "verify-me",
  appSecret: "app-secret",
};

describe("WhatsAppAdapter", () => {
  let adapter: WhatsAppAdapter;

  beforeEach(() => {
    adapter = new WhatsAppAdapter(CONFIG);
  });

  it("platform is whatsapp", () => {
    expect(adapter.platform).toBe("whatsapp");
  });

  it("handleChallenge returns challenge value for valid GET", () => {
    const url = new URL("https://example.com/webhook");
    url.searchParams.set("hub.mode", "subscribe");
    url.searchParams.set("hub.verify_token", "verify-me");
    url.searchParams.set("hub.challenge", "challenge-123");
    const req = new Request(url.toString(), { method: "GET" });

    const resp = adapter.handleChallenge(req);
    expect(resp).not.toBeNull();
  });

  it("handleChallenge returns null for invalid verify token", () => {
    const url = new URL("https://example.com/webhook");
    url.searchParams.set("hub.mode", "subscribe");
    url.searchParams.set("hub.verify_token", "wrong-token");
    url.searchParams.set("hub.challenge", "challenge-123");
    const req = new Request(url.toString(), { method: "GET" });

    const resp = adapter.handleChallenge(req);
    expect(resp).toBeNull();
  });

  it("parseIncoming extracts text message", () => {
    const body = {
      entry: [{
        changes: [{
          value: {
            messages: [{
              id: "wamid.123",
              from: "8210012345678",
              timestamp: "1700000000",
              type: "text",
              text: { body: "Hello Busan!" },
            }],
            metadata: { phone_number_id: "123456" },
          },
        }],
      }],
    };

    const messages = adapter.parseIncoming(body);
    expect(messages).toHaveLength(1);
    expect(messages[0]!.type).toBe("text");
    expect(messages[0]!.text).toBe("Hello Busan!");
    expect(messages[0]!.platform).toBe("whatsapp");
    expect(messages[0]!.userId).toBe("8210012345678");
    expect(messages[0]!.chatId).toBe("8210012345678");
  });

  it("parseIncoming extracts location message", () => {
    const body = {
      entry: [{
        changes: [{
          value: {
            messages: [{
              id: "wamid.456",
              from: "8210012345678",
              timestamp: "1700000000",
              type: "location",
              location: { latitude: 35.1587, longitude: 129.1604 },
            }],
            metadata: { phone_number_id: "123456" },
          },
        }],
      }],
    };

    const messages = adapter.parseIncoming(body);
    expect(messages).toHaveLength(1);
    expect(messages[0]!.type).toBe("location");
    expect(messages[0]!.location?.latitude).toBe(35.1587);
  });

  it("parseIncoming extracts interactive button reply", () => {
    const body = {
      entry: [{
        changes: [{
          value: {
            messages: [{
              id: "wamid.789",
              from: "8210012345678",
              timestamp: "1700000000",
              type: "interactive",
              interactive: { type: "button_reply", button_reply: { id: "btn-transit", title: "Find Route" } },
            }],
            metadata: { phone_number_id: "123456" },
          },
        }],
      }],
    };

    const messages = adapter.parseIncoming(body);
    expect(messages).toHaveLength(1);
    expect(messages[0]!.type).toBe("button_reply");
    expect(messages[0]!.buttonPayload).toBe("btn-transit");
  });

  it("parseIncoming returns empty array for status-only payload", () => {
    const body = {
      entry: [{
        changes: [{
          value: { statuses: [{ id: "wamid.123", status: "read" }] },
        }],
      }],
    };

    const messages = adapter.parseIncoming(body);
    expect(messages).toHaveLength(0);
  });

  it("getConstraints returns WhatsApp limits", () => {
    const c = adapter.getConstraints();
    expect(c.maxTextLength).toBe(4096);
    expect(c.maxButtons).toBe(3);
    expect(c.supportsCarousel).toBe(false);
  });
});
