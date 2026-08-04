import { createHmac } from "node:crypto";
import type { BotAdapter } from "./adapter";
import type { IncomingMessage, OutgoingMessage, PlatformConstraints } from "./types";

interface LineConfig {
  channelAccessToken: string;
  channelSecret: string;
}

const LINE_API_BASE = "https://api.line.me/v2/bot";

export class LineAdapter implements BotAdapter {
  readonly platform = "line" as const;

  constructor(private config: LineConfig) {}

  async verifyWebhook(req: Request): Promise<boolean> {
    const body = await req.clone().text();
    const signature = req.headers.get("x-line-signature");
    if (!signature) return false;

    const expected = createHmac("sha256", this.config.channelSecret)
      .update(body, "utf8")
      .digest("base64");

    return signature === expected;
  }

  parseIncoming(body: unknown): IncomingMessage[] {
    const messages: IncomingMessage[] = [];
    const data = body as Record<string, unknown>;
    const events = (data?.events as Array<Record<string, unknown>>) ?? [];

    for (const event of events) {
      const parsed = this.parseEvent(event);
      if (parsed) messages.push(parsed);
    }
    return messages;
  }

  private parseEvent(event: Record<string, unknown>): IncomingMessage | null {
    const source = event.source as Record<string, string> | undefined;
    const userId = source?.userId ?? "";
    // For group/room chats, chatId is groupId/roomId; for 1:1, it's userId
    const chatId = source?.groupId ?? source?.roomId ?? userId;
    const replyToken = String(event.replyToken ?? "");

    const base = {
      platform: "line" as const,
      platformMessageId: "",
      chatId,
      userId,
      timestamp: new Date(Number(event.timestamp ?? 0)),
      raw: { ...event, replyToken },
    };

    if (event.type === "message") {
      const msg = event.message as Record<string, unknown> | undefined;
      if (!msg) return null;
      base.platformMessageId = String(msg.id ?? "");

      switch (msg.type) {
        case "text":
          return { ...base, type: "text", text: String(msg.text ?? "") };
        case "location":
          return {
            ...base,
            type: "location",
            location: {
              latitude: Number(msg.latitude ?? 0),
              longitude: Number(msg.longitude ?? 0),
            },
          };
        case "image":
          return { ...base, type: "image", imageUrl: String(msg.id ?? "") };
        case "sticker":
          return { ...base, type: "sticker" };
        default:
          return { ...base, type: "unsupported" };
      }
    }

    if (event.type === "postback") {
      const postback = event.postback as Record<string, string> | undefined;
      return {
        ...base,
        type: "button_reply",
        buttonPayload: postback?.data ?? "",
      };
    }

    // Skip follow, unfollow, join, leave, etc.
    return null;
  }

  async sendMessage(chatId: string, message: OutgoingMessage): Promise<void> {
    const url = `${LINE_API_BASE}/message/push`;
    const lineMessages = this.buildLineMessages(message);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.channelAccessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ to: chatId, messages: lineMessages }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`LINE send failed (${response.status}): ${errorBody}`);
    }
  }

  private buildLineMessages(
    message: OutgoingMessage,
  ): Array<Record<string, unknown>> {
    if (message.type === "text" || (!message.buttons && message.text)) {
      return [{ type: "text", text: message.text ?? "" }];
    }

    if (message.type === "buttons" && message.buttons) {
      const actions = message.buttons.slice(0, 13).map((b) => ({
        type: "postback",
        label: b.label.slice(0, 20),
        data: b.id,
        displayText: b.label,
      }));
      return [{
        type: "template",
        altText: message.text ?? "Choose an option",
        template: {
          type: "buttons",
          text: (message.text ?? "Choose:").slice(0, 160),
          actions,
        },
      }];
    }

    if (message.type === "location" && message.location) {
      return [{
        type: "location",
        title: message.location.label.slice(0, 100),
        address: message.location.label,
        latitude: message.location.latitude,
        longitude: message.location.longitude,
      }];
    }

    if (message.type === "image" && message.imageUrl) {
      return [{
        type: "image",
        originalContentUrl: message.imageUrl,
        previewImageUrl: message.imageUrl,
      }];
    }

    return [{ type: "text", text: message.text ?? "" }];
  }

  async sendTypingIndicator(_chatId: string): Promise<void> {
    // LINE does not have a typing indicator API for push messages
    // No-op
  }

  getConstraints(): PlatformConstraints {
    return {
      maxTextLength: 5000,
      maxButtons: 13,
      supportsCarousel: true,
      supportsQuickReply: true,
    };
  }
}
