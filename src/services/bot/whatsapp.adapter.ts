import type { BotAdapter } from "./adapter";
import type { IncomingMessage, OutgoingMessage, PlatformConstraints } from "./types";
import { verifyHmacSignature } from "@/lib/utils/crypto";

interface WhatsAppConfig {
  phoneNumberId: string;
  accessToken: string;
  verifyToken: string;
  appSecret: string;
}

const WHATSAPP_API_BASE = "https://graph.facebook.com/v21.0";

export class WhatsAppAdapter implements BotAdapter {
  readonly platform = "whatsapp" as const;

  constructor(private config: WhatsAppConfig) {}

  async verifyWebhook(req: Request): Promise<boolean> {
    const body = await req.clone().text();
    const signature = req.headers.get("x-hub-signature-256");
    if (!signature) return false;
    const sig = signature.replace("sha256=", "");
    return verifyHmacSignature(body, sig, this.config.appSecret, "sha256");
  }

  handleChallenge(req: Request): Response | null {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && token === this.config.verifyToken && challenge) {
      return new Response(challenge, { status: 200 });
    }
    return null;
  }

  parseIncoming(body: unknown): IncomingMessage[] {
    const messages: IncomingMessage[] = [];
    const data = body as Record<string, unknown>;
    const entries = (data?.entry as Array<Record<string, unknown>>) ?? [];

    for (const entry of entries) {
      const changes = (entry.changes as Array<Record<string, unknown>>) ?? [];
      for (const change of changes) {
        const value = change.value as Record<string, unknown> | undefined;
        if (!value) continue;
        const rawMessages = (value.messages as Array<Record<string, unknown>>) ?? [];
        for (const msg of rawMessages) {
          messages.push(this.parseMessage(msg));
        }
      }
    }
    return messages;
  }

  private parseMessage(msg: Record<string, unknown>): IncomingMessage {
    const base = {
      platform: "whatsapp" as const,
      platformMessageId: String(msg.id ?? ""),
      chatId: String(msg.from ?? ""),
      userId: String(msg.from ?? ""),
      timestamp: new Date(Number(msg.timestamp ?? 0) * 1000),
      raw: msg,
    };

    switch (msg.type) {
      case "text": {
        const textObj = msg.text as Record<string, unknown> | undefined;
        return { ...base, type: "text", text: String(textObj?.body ?? "") };
      }
      case "location": {
        const loc = msg.location as Record<string, number> | undefined;
        const lat = loc?.latitude;
        const lng = loc?.longitude;
        return {
          ...base,
          type: "location",
          location: (lat !== undefined && lng !== undefined) ? { latitude: lat, longitude: lng } : undefined,
        };
      }
      case "interactive": {
        const interactive = msg.interactive as Record<string, unknown> | undefined;
        if (interactive?.type === "button_reply") {
          const reply = interactive.button_reply as Record<string, string> | undefined;
          return { ...base, type: "button_reply", buttonPayload: reply?.id };
        }
        if (interactive?.type === "list_reply") {
          const reply = interactive.list_reply as Record<string, string> | undefined;
          return { ...base, type: "button_reply", buttonPayload: reply?.id };
        }
        return { ...base, type: "unsupported" };
      }
      case "image": {
        const image = msg.image as Record<string, string> | undefined;
        return { ...base, type: "image", imageUrl: image?.id };
      }
      default:
        return { ...base, type: "unsupported" };
    }
  }

  async sendMessage(chatId: string, message: OutgoingMessage): Promise<void> {
    const url = `${WHATSAPP_API_BASE}/${this.config.phoneNumberId}/messages`;
    const payload = this.buildSendPayload(chatId, message);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`WhatsApp send failed (${response.status}): ${errorBody}`);
    }
  }

  private buildSendPayload(
    chatId: string,
    message: OutgoingMessage,
  ): Record<string, unknown> {
    const base = { messaging_product: "whatsapp", to: chatId };

    if (message.type === "text" || (!message.buttons && message.text)) {
      return { ...base, type: "text", text: { body: message.text ?? "" } };
    }

    if (message.type === "buttons" && message.buttons) {
      const buttons = message.buttons.slice(0, 3).map((b) => ({
        type: "reply",
        reply: { id: b.id, title: b.label.slice(0, 20) },
      }));
      return {
        ...base,
        type: "interactive",
        interactive: {
          type: "button",
          body: { text: message.text ?? "Choose:" },
          action: { buttons },
        },
      };
    }

    if (message.type === "location" && message.location) {
      return {
        ...base,
        type: "location",
        location: {
          latitude: message.location.latitude,
          longitude: message.location.longitude,
          name: message.location.label,
        },
      };
    }

    if (message.type === "image" && message.imageUrl) {
      return {
        ...base,
        type: "image",
        image: { link: message.imageUrl },
      };
    }

    return { ...base, type: "text", text: { body: message.text ?? "" } };
  }

  async sendTypingIndicator(chatId: string): Promise<void> {
    const url = `${WHATSAPP_API_BASE}/${this.config.phoneNumberId}/messages`;
    await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: chatId,
        status: "typing",
      }),
    }).catch(() => {
      // Non-critical: ignore typing indicator failures
    });
  }

  getConstraints(): PlatformConstraints {
    return {
      maxTextLength: 4096,
      maxButtons: 3,
      supportsCarousel: false,
      supportsQuickReply: true,
    };
  }
}
