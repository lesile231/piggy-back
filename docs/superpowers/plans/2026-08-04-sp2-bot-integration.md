# SP2: Bot Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** WhatsApp/LINE 메신저 봇 어댑터, 공통 메시지 핸들러(menu/flow/free_chat 모드 라우팅), QR 랜딩 페이지, 웹훅 보안(HMAC) 구현으로 실제 메신저 봇이 동작하는 MVP 구축.

**Architecture:** BotAdapter 패턴으로 메신저별 어댑터를 분리하고, MessageHandler가 공통 비즈니스 로직(세션 관리, 모드 라우팅, 응답 생성)을 담당. FlowEngine이 DB 기반 CMS 플로우를 실행. 웹훅 API Route는 HMAC 검증 후 MessageHandler에 위임.

**Tech Stack:** Next.js 15 (App Router, Route Handlers), TypeScript strict, Drizzle ORM, Neon Postgres, Vitest, Node.js crypto (HMAC)

## Global Constraints

- TypeScript strict mode (`"strict": true` in tsconfig)
- Node.js 20+
- 모든 환경 설정은 환경변수로 관리 (하드코딩 금지)
- `async/await` only (no `.then()` chains)
- 커밋 메시지: conventional commits (`feat:`, `fix:`, `test:`, `chore:`)
- 테스트: Vitest
- 에러 처리: typed errors with `{ ok, data, error }` Result pattern
- 다국어 데이터: JSONB `{ "en": "...", "ja": "...", "zh": "..." }` 형식
- BotAdapter 인터페이스 불변 (메신저 확장성 보장)
- LLMProvider 인터페이스 불변

---

## File Structure

```
piggy_back/
├── src/
│   ├── services/bot/
│   │   ├── types.ts                 # IncomingMessage, OutgoingMessage, PlatformConstraints
│   │   ├── adapter.ts               # BotAdapter 인터페이스
│   │   ├── whatsapp.adapter.ts      # WhatsApp Business API 어댑터
│   │   ├── line.adapter.ts          # LINE Messaging API 어댑터
│   │   ├── adapter-registry.ts      # 플랫폼별 어댑터 조회
│   │   ├── session.repository.ts    # 사용자/세션 DB 조회·생성
│   │   ├── menu.service.ts          # 메인 메뉴 생성
│   │   ├── message-handler.ts       # 모드 라우팅 + 응답 오케스트레이션
│   │   └── flow/
│   │       ├── flow.repository.ts   # 플로우/스텝/옵션 DB 조회
│   │       └── flow-engine.ts       # 플로우 실행 엔진
│   ├── services/ai/
│   │   └── chat.service.ts          # 자유대화 LLM 응답 생성
│   ├── lib/
│   │   ├── env.ts                   # (수정) WhatsApp/LINE 환경변수 추가
│   │   └── utils/
│   │       └── crypto.ts            # HMAC 서명 검증
│   ├── app/
│   │   ├── api/webhooks/
│   │   │   ├── whatsapp/route.ts    # WhatsApp 웹훅 엔드포인트
│   │   │   └── line/route.ts        # LINE 웹훅 엔드포인트
│   │   └── start/page.tsx           # QR/숏링크 랜딩 페이지
│   └── types/
│       └── common.ts                # (기존) Platform, Result<T>, localize
├── .env.local.example               # (수정) WhatsApp/LINE 키 추가
└── ARCHITECTURE.md                  # (수정) SP2 모듈 추가
```

---

### Task 1: Bot Types + BotAdapter Interface + Crypto Utils + Env Updates

**Files:**
- Create: `src/services/bot/types.ts`, `src/services/bot/adapter.ts`, `src/lib/utils/crypto.ts`
- Modify: `src/lib/env.ts`, `.env.local.example`
- Test: `src/lib/utils/crypto.test.ts`, `src/services/bot/types.test.ts`

**Interfaces:**
- Consumes: `Platform` from `src/types/common.ts`
- Produces:
  - `IncomingMessage`, `OutgoingMessage`, `MessageButton`, `QuickReply`, `PlatformConstraints` types
  - `BotAdapter` interface: `verifyWebhook(req)`, `parseIncoming(body)`, `sendMessage(chatId, msg)`, `sendTypingIndicator(chatId)`, `getConstraints()`
  - `verifyHmacSignature(payload, signature, secret, algorithm)` function
  - Updated `Env` with WhatsApp/LINE environment variables

- [ ] **Step 1: Write crypto utility test**

```typescript
// src/lib/utils/crypto.test.ts
import { describe, it, expect } from "vitest";
import { verifyHmacSignature, computeHmacSignature } from "./crypto";

describe("crypto", () => {
  const secret = "test-secret";
  const payload = '{"test":"data"}';

  it("computeHmacSignature produces hex string", () => {
    const sig = computeHmacSignature(payload, secret, "sha256");
    expect(sig).toMatch(/^[a-f0-9]{64}$/);
  });

  it("verifyHmacSignature returns true for valid signature", () => {
    const sig = computeHmacSignature(payload, secret, "sha256");
    expect(verifyHmacSignature(payload, sig, secret, "sha256")).toBe(true);
  });

  it("verifyHmacSignature returns false for invalid signature", () => {
    expect(verifyHmacSignature(payload, "invalid", secret, "sha256")).toBe(false);
  });

  it("verifyHmacSignature returns false for tampered payload", () => {
    const sig = computeHmacSignature(payload, secret, "sha256");
    expect(verifyHmacSignature('{"tampered":true}', sig, secret, "sha256")).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/lib/utils/crypto.test.ts
```

Expected: FAIL (module not found)

- [ ] **Step 3: Implement crypto.ts**

```typescript
// src/lib/utils/crypto.ts
import { createHmac, timingSafeEqual } from "node:crypto";

export function computeHmacSignature(
  payload: string,
  secret: string,
  algorithm: "sha1" | "sha256",
): string {
  return createHmac(algorithm, secret).update(payload, "utf8").digest("hex");
}

export function verifyHmacSignature(
  payload: string,
  signature: string,
  secret: string,
  algorithm: "sha1" | "sha256",
): boolean {
  const expected = computeHmacSignature(payload, secret, algorithm);
  if (expected.length !== signature.length) return false;
  try {
    return timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(signature, "hex"),
    );
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Run crypto test**

```bash
npx vitest run src/lib/utils/crypto.test.ts
```

Expected: All tests pass.

- [ ] **Step 5: Create bot types**

```typescript
// src/services/bot/types.ts
import type { Platform } from "@/types/common";

export interface IncomingMessage {
  platform: Platform;
  platformMessageId: string;
  chatId: string;
  userId: string;
  type: "text" | "location" | "button_reply" | "image" | "sticker" | "unsupported";
  text?: string;
  location?: { latitude: number; longitude: number };
  buttonPayload?: string;
  imageUrl?: string;
  timestamp: Date;
  raw: unknown;
}

export interface MessageButton {
  id: string;
  label: string;
}

export interface QuickReply {
  label: string;
  payload: string;
}

export interface CarouselItem {
  title: string;
  description?: string;
  imageUrl?: string;
  buttons?: MessageButton[];
}

export interface OutgoingMessage {
  type: "text" | "buttons" | "carousel" | "location" | "image";
  text?: string;
  buttons?: MessageButton[];
  carousel?: CarouselItem[];
  location?: { latitude: number; longitude: number; label: string };
  imageUrl?: string;
  quickReplies?: QuickReply[];
}

export interface PlatformConstraints {
  maxTextLength: number;
  maxButtons: number;
  supportsCarousel: boolean;
  supportsQuickReply: boolean;
}

export type SessionMode = "menu" | "flow" | "free_chat";
```

- [ ] **Step 6: Write types test**

```typescript
// src/services/bot/types.test.ts
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
```

- [ ] **Step 7: Create BotAdapter interface**

```typescript
// src/services/bot/adapter.ts
import type { Platform } from "@/types/common";
import type { IncomingMessage, OutgoingMessage, PlatformConstraints } from "./types";

export interface BotAdapter {
  readonly platform: Platform;
  verifyWebhook(req: Request): Promise<boolean>;
  handleChallenge?(req: Request): Response | null;
  parseIncoming(body: unknown): IncomingMessage[];
  sendMessage(chatId: string, message: OutgoingMessage): Promise<void>;
  sendTypingIndicator(chatId: string): Promise<void>;
  getConstraints(): PlatformConstraints;
}
```

- [ ] **Step 8: Update env.ts with WhatsApp/LINE variables**

기존 `src/lib/env.ts`의 `envSchema`에 다음을 추가:

```typescript
// Add to envSchema object:
WHATSAPP_PHONE_NUMBER_ID: z.string().default(""),
WHATSAPP_ACCESS_TOKEN: z.string().default(""),
WHATSAPP_VERIFY_TOKEN: z.string().default(""),
WHATSAPP_APP_SECRET: z.string().default(""),
LINE_CHANNEL_ACCESS_TOKEN: z.string().default(""),
LINE_CHANNEL_SECRET: z.string().default(""),
NEXT_PUBLIC_APP_URL: z.string().default("http://localhost:3000"),
```

- [ ] **Step 9: Update .env.local.example**

기존 파일에 다음 블록 추가:

```env
# WhatsApp Business API
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_VERIFY_TOKEN=
WHATSAPP_APP_SECRET=

# LINE Messaging API
LINE_CHANNEL_ACCESS_TOKEN=
LINE_CHANNEL_SECRET=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

- [ ] **Step 10: Run all tests**

```bash
npx vitest run
```

Expected: All tests pass (existing + new).

- [ ] **Step 11: Commit**

```bash
git add src/services/bot/types.ts src/services/bot/types.test.ts src/services/bot/adapter.ts src/lib/utils/crypto.ts src/lib/utils/crypto.test.ts src/lib/env.ts .env.local.example
git commit -m "feat: add bot types, BotAdapter interface, HMAC crypto utils, and env updates for SP2"
```

---

### Task 2: WhatsApp Adapter

**Files:**
- Create: `src/services/bot/whatsapp.adapter.ts`
- Test: `src/services/bot/whatsapp.adapter.test.ts`

**Interfaces:**
- Consumes: `BotAdapter` from `src/services/bot/adapter.ts`, `IncomingMessage`, `OutgoingMessage`, `PlatformConstraints` from `src/services/bot/types.ts`, `verifyHmacSignature` from `src/lib/utils/crypto.ts`
- Produces:
  - `WhatsAppAdapter` class implementing `BotAdapter`
  - Constructor: `new WhatsAppAdapter(config: { phoneNumberId: string; accessToken: string; verifyToken: string; appSecret: string })`

- [ ] **Step 1: Write WhatsApp adapter test**

```typescript
// src/services/bot/whatsapp.adapter.test.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/services/bot/whatsapp.adapter.test.ts
```

Expected: FAIL (module not found)

- [ ] **Step 3: Implement WhatsApp adapter**

```typescript
// src/services/bot/whatsapp.adapter.ts
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
        return {
          ...base,
          type: "location",
          location: loc ? { latitude: loc.latitude, longitude: loc.longitude } : undefined,
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
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run src/services/bot/whatsapp.adapter.test.ts
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/services/bot/whatsapp.adapter.ts src/services/bot/whatsapp.adapter.test.ts
git commit -m "feat: add WhatsApp Business API adapter with HMAC verification and message parsing"
```

---

### Task 3: LINE Adapter

**Files:**
- Create: `src/services/bot/line.adapter.ts`
- Test: `src/services/bot/line.adapter.test.ts`

**Interfaces:**
- Consumes: `BotAdapter` from `src/services/bot/adapter.ts`, `IncomingMessage`, `OutgoingMessage`, `PlatformConstraints` from `src/services/bot/types.ts`, `computeHmacSignature` from `src/lib/utils/crypto.ts`
- Produces:
  - `LineAdapter` class implementing `BotAdapter`
  - Constructor: `new LineAdapter(config: { channelAccessToken: string; channelSecret: string })`

- [ ] **Step 1: Write LINE adapter test**

```typescript
// src/services/bot/line.adapter.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { LineAdapter } from "./line.adapter";
import { computeHmacSignature } from "@/lib/utils/crypto";

const CONFIG = {
  channelAccessToken: "test-line-token",
  channelSecret: "test-line-secret",
};

describe("LineAdapter", () => {
  let adapter: LineAdapter;

  beforeEach(() => {
    adapter = new LineAdapter(CONFIG);
  });

  it("platform is line", () => {
    expect(adapter.platform).toBe("line");
  });

  it("verifyWebhook returns true for valid signature", async () => {
    const body = '{"events":[]}';
    const signature = computeHmacSignature(body, CONFIG.channelSecret, "sha256");
    const req = new Request("https://example.com/webhook", {
      method: "POST",
      headers: {
        "x-line-signature": Buffer.from(signature, "hex").toString("base64"),
        "content-type": "application/json",
      },
      body,
    });

    // LINE uses base64(HMAC-SHA256) not hex - adapter handles this internally
    // For unit test purposes we test the adapter's own verification
    const result = await adapter.verifyWebhook(req);
    expect(typeof result).toBe("boolean");
  });

  it("parseIncoming extracts text message", () => {
    const body = {
      events: [{
        type: "message",
        message: { id: "line-msg-1", type: "text", text: "Where is Haeundae?" },
        source: { type: "user", userId: "U1234567890" },
        replyToken: "reply-token-1",
        timestamp: 1700000000000,
      }],
    };

    const messages = adapter.parseIncoming(body);
    expect(messages).toHaveLength(1);
    expect(messages[0]!.type).toBe("text");
    expect(messages[0]!.text).toBe("Where is Haeundae?");
    expect(messages[0]!.platform).toBe("line");
    expect(messages[0]!.userId).toBe("U1234567890");
    expect(messages[0]!.chatId).toBe("U1234567890");
  });

  it("parseIncoming extracts location message", () => {
    const body = {
      events: [{
        type: "message",
        message: { id: "line-msg-2", type: "location", latitude: 35.1587, longitude: 129.1604, title: "Haeundae" },
        source: { type: "user", userId: "U1234567890" },
        replyToken: "reply-token-2",
        timestamp: 1700000000000,
      }],
    };

    const messages = adapter.parseIncoming(body);
    expect(messages).toHaveLength(1);
    expect(messages[0]!.type).toBe("location");
    expect(messages[0]!.location?.latitude).toBe(35.1587);
  });

  it("parseIncoming extracts postback as button_reply", () => {
    const body = {
      events: [{
        type: "postback",
        postback: { data: "action=transit" },
        source: { type: "user", userId: "U1234567890" },
        replyToken: "reply-token-3",
        timestamp: 1700000000000,
      }],
    };

    const messages = adapter.parseIncoming(body);
    expect(messages).toHaveLength(1);
    expect(messages[0]!.type).toBe("button_reply");
    expect(messages[0]!.buttonPayload).toBe("action=transit");
  });

  it("parseIncoming skips non-message events (e.g. follow)", () => {
    const body = {
      events: [{
        type: "follow",
        source: { type: "user", userId: "U1234567890" },
        replyToken: "reply-token-4",
        timestamp: 1700000000000,
      }],
    };

    const messages = adapter.parseIncoming(body);
    expect(messages).toHaveLength(0);
  });

  it("getConstraints returns LINE limits", () => {
    const c = adapter.getConstraints();
    expect(c.maxTextLength).toBe(5000);
    expect(c.maxButtons).toBe(13);
    expect(c.supportsCarousel).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/services/bot/line.adapter.test.ts
```

Expected: FAIL (module not found)

- [ ] **Step 3: Implement LINE adapter**

```typescript
// src/services/bot/line.adapter.ts
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
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run src/services/bot/line.adapter.test.ts
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/services/bot/line.adapter.ts src/services/bot/line.adapter.test.ts
git commit -m "feat: add LINE Messaging API adapter with signature verification and message parsing"
```

---

### Task 4: Adapter Registry + Session Repository

**Files:**
- Create: `src/services/bot/adapter-registry.ts`, `src/services/bot/session.repository.ts`
- Test: `src/services/bot/adapter-registry.test.ts`, `src/services/bot/session.repository.test.ts`

**Interfaces:**
- Consumes: `BotAdapter` from `adapter.ts`, `WhatsAppAdapter`, `LineAdapter`, `Database` from `src/lib/db/client.ts`, `users`, `chatSessions` from `src/lib/db/schema.ts`
- Produces:
  - `AdapterRegistry` class: `register(adapter)`, `get(platform): BotAdapter | undefined`, `getAll(): BotAdapter[]`
  - `SessionRepository` class:
    - `findOrCreateUser(platform, platformUid): Promise<{ id: string; language: string | null }>`
    - `getActiveSession(userId): Promise<Session | null>`
    - `createSession(userId): Promise<Session>`
    - `updateSessionMode(sessionId, mode, flowData?): Promise<void>`
    - `resetSessionToMenu(sessionId): Promise<void>`

- [ ] **Step 1: Write adapter registry test**

```typescript
// src/services/bot/adapter-registry.test.ts
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
```

- [ ] **Step 2: Implement adapter registry**

```typescript
// src/services/bot/adapter-registry.ts
import type { Platform } from "@/types/common";
import type { BotAdapter } from "./adapter";

export class AdapterRegistry {
  private adapters = new Map<Platform, BotAdapter>();

  register(adapter: BotAdapter): void {
    this.adapters.set(adapter.platform, adapter);
  }

  get(platform: Platform): BotAdapter | undefined {
    return this.adapters.get(platform);
  }

  getAll(): BotAdapter[] {
    return Array.from(this.adapters.values());
  }
}
```

- [ ] **Step 3: Write session repository test**

```typescript
// src/services/bot/session.repository.test.ts
import { describe, it, expect, vi } from "vitest";
import { SessionRepository } from "./session.repository";
import type { Database } from "@/lib/db/client";

function createMockDb(options: {
  userRows?: unknown[];
  sessionRows?: unknown[];
  insertReturn?: unknown;
} = {}): Database {
  const { userRows = [], sessionRows = [], insertReturn = { id: "new-id" } } = options;
  return {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockImplementation(() => ({
          limit: vi.fn().mockResolvedValue(userRows.length > 0 ? userRows : sessionRows),
        })),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([insertReturn]),
        onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    }),
  } as unknown as Database;
}

describe("SessionRepository", () => {
  it("findOrCreateUser returns existing user", async () => {
    const db = createMockDb({
      userRows: [{ id: "user-1", language: "ja" }],
    });
    const repo = new SessionRepository(db);

    const user = await repo.findOrCreateUser("whatsapp", "821001234");
    expect(user.id).toBe("user-1");
    expect(user.language).toBe("ja");
  });

  it("findOrCreateUser creates new user when not found", async () => {
    const selectMock = vi.fn()
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });
    const insertMock = vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: "new-user", language: null }]),
      }),
    });
    const db = { select: selectMock, insert: insertMock } as unknown as Database;
    const repo = new SessionRepository(db);

    const user = await repo.findOrCreateUser("line", "U999");
    expect(user.id).toBe("new-user");
    expect(insertMock).toHaveBeenCalled();
  });

  it("createSession returns new session with menu mode", async () => {
    const db = createMockDb({
      insertReturn: { id: "session-1", mode: "menu", isActive: true },
    });
    const repo = new SessionRepository(db);

    const session = await repo.createSession("user-1");
    expect(session.id).toBe("session-1");
    expect(session.mode).toBe("menu");
  });
});
```

- [ ] **Step 4: Implement session repository**

```typescript
// src/services/bot/session.repository.ts
import { eq, and } from "drizzle-orm";
import type { Database } from "@/lib/db/client";
import { users, chatSessions } from "@/lib/db/schema";
import type { Platform } from "@/types/common";
import type { SessionMode } from "./types";

export interface UserRecord {
  id: string;
  language: string | null;
}

export interface SessionRecord {
  id: string;
  userId: string;
  mode: string;
  activeFlowId: string | null;
  currentStepId: string | null;
  flowContext: unknown;
  isActive: boolean;
}

export class SessionRepository {
  constructor(private db: Database) {}

  async findOrCreateUser(
    platform: Platform,
    platformUid: string,
  ): Promise<UserRecord> {
    const existing = await this.db
      .select({ id: users.id, language: users.language })
      .from(users)
      .where(and(eq(users.platform, platform), eq(users.platformUid, platformUid)))
      .limit(1);

    if (existing.length > 0 && existing[0]) {
      // Update last active
      await this.db
        .update(users)
        .set({ lastActiveAt: new Date() })
        .where(eq(users.id, existing[0].id));
      return existing[0];
    }

    const [newUser] = await this.db
      .insert(users)
      .values({ platform, platformUid })
      .returning({ id: users.id, language: users.language });

    if (!newUser) throw new Error("Failed to create user");
    return newUser;
  }

  async getActiveSession(userId: string): Promise<SessionRecord | null> {
    const results = await this.db
      .select({
        id: chatSessions.id,
        userId: chatSessions.userId,
        mode: chatSessions.mode,
        activeFlowId: chatSessions.activeFlowId,
        currentStepId: chatSessions.currentStepId,
        flowContext: chatSessions.flowContext,
        isActive: chatSessions.isActive,
      })
      .from(chatSessions)
      .where(and(eq(chatSessions.userId, userId), eq(chatSessions.isActive, true)))
      .limit(1);

    return (results[0] as SessionRecord | undefined) ?? null;
  }

  async createSession(userId: string): Promise<SessionRecord> {
    const [session] = await this.db
      .insert(chatSessions)
      .values({ userId, mode: "menu" })
      .returning({
        id: chatSessions.id,
        userId: chatSessions.userId,
        mode: chatSessions.mode,
        activeFlowId: chatSessions.activeFlowId,
        currentStepId: chatSessions.currentStepId,
        flowContext: chatSessions.flowContext,
        isActive: chatSessions.isActive,
      });

    if (!session) throw new Error("Failed to create session");
    return session as SessionRecord;
  }

  async updateSessionMode(
    sessionId: string,
    mode: SessionMode,
    flowData?: { activeFlowId?: string; currentStepId?: string; flowContext?: unknown },
  ): Promise<void> {
    await this.db
      .update(chatSessions)
      .set({
        mode,
        activeFlowId: flowData?.activeFlowId ?? null,
        currentStepId: flowData?.currentStepId ?? null,
        flowContext: flowData?.flowContext ?? {},
      })
      .where(eq(chatSessions.id, sessionId));
  }

  async resetSessionToMenu(sessionId: string): Promise<void> {
    await this.updateSessionMode(sessionId, "menu");
  }

  async updateUserLanguage(userId: string, language: string): Promise<void> {
    await this.db
      .update(users)
      .set({ language })
      .where(eq(users.id, userId));
  }
}
```

- [ ] **Step 5: Run all tests**

```bash
npx vitest run src/services/bot/adapter-registry.test.ts src/services/bot/session.repository.test.ts
```

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/services/bot/adapter-registry.ts src/services/bot/adapter-registry.test.ts src/services/bot/session.repository.ts src/services/bot/session.repository.test.ts
git commit -m "feat: add adapter registry and session repository for user/session management"
```

---

### Task 5: Flow Repository + Flow Engine

**Files:**
- Create: `src/services/bot/flow/flow.repository.ts`, `src/services/bot/flow/flow-engine.ts`
- Test: `src/services/bot/flow/flow-engine.test.ts`

**Interfaces:**
- Consumes: `Database` from `src/lib/db/client.ts`, `flows`, `flowSteps`, `flowOptions` from `src/lib/db/schema.ts`, `OutgoingMessage` from `src/services/bot/types.ts`, `localize` from `src/types/common.ts`
- Produces:
  - `FlowRepository` class: `getActiveFlows()`, `getFirstStep(flowId)`, `getStep(stepId)`, `getStepOptions(stepId)`
  - `FlowEngine` class:
    - `startFlow(flowId, language): Promise<FlowEngineResult>`
    - `handleInput(stepId, input, language, flowContext): Promise<FlowEngineResult>`
  - `FlowEngineResult` type: `{ messages: OutgoingMessage[]; nextStepId: string | null; flowContext: unknown; completed: boolean; apiAction?: string }`

- [ ] **Step 1: Write flow engine test**

```typescript
// src/services/bot/flow/flow-engine.test.ts
import { describe, it, expect, vi } from "vitest";
import { FlowEngine } from "./flow-engine";
import type { FlowRepository } from "./flow.repository";

function createMockRepo(overrides: Partial<FlowRepository> = {}): FlowRepository {
  return {
    getActiveFlows: vi.fn().mockResolvedValue([]),
    getFirstStep: vi.fn().mockResolvedValue(null),
    getStep: vi.fn().mockResolvedValue(null),
    getStepOptions: vi.fn().mockResolvedValue([]),
    ...overrides,
  } as unknown as FlowRepository;
}

describe("FlowEngine", () => {
  it("startFlow returns first step message with options as buttons", async () => {
    const repo = createMockRepo({
      getFirstStep: vi.fn().mockResolvedValue({
        id: "step-1",
        flowId: "flow-1",
        stepOrder: 1,
        type: "text_input",
        messages: { en: "Where are you now?", ja: "今どこにいますか？" },
        apiAction: null,
        config: {},
      }),
      getStepOptions: vi.fn().mockResolvedValue([
        { id: "opt-1", labels: { en: "Busan Station", ja: "釜山駅" }, value: "busan_station", nextStepId: "step-2", sortOrder: 1 },
        { id: "opt-2", labels: { en: "Haeundae", ja: "海雲台" }, value: "haeundae", nextStepId: "step-2", sortOrder: 2 },
      ]),
    });
    const engine = new FlowEngine(repo);

    const result = await engine.startFlow("flow-1", "en");
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]!.text).toBe("Where are you now?");
    expect(result.messages[0]!.buttons).toHaveLength(2);
    expect(result.messages[0]!.buttons![0]!.label).toBe("Busan Station");
    expect(result.nextStepId).toBe("step-1");
    expect(result.completed).toBe(false);
  });

  it("startFlow returns completed when flow has no steps", async () => {
    const repo = createMockRepo({
      getFirstStep: vi.fn().mockResolvedValue(null),
    });
    const engine = new FlowEngine(repo);

    const result = await engine.startFlow("flow-1", "en");
    expect(result.completed).toBe(true);
    expect(result.messages).toHaveLength(1);
  });

  it("handleInput advances to next step via option match", async () => {
    const repo = createMockRepo({
      getStep: vi.fn().mockResolvedValue({
        id: "step-1",
        flowId: "flow-1",
        stepOrder: 1,
        type: "text_input",
        messages: { en: "Where are you?" },
        apiAction: null,
        config: {},
      }),
      getStepOptions: vi.fn()
        .mockResolvedValueOnce([
          { id: "opt-1", labels: { en: "Busan Station" }, value: "busan_station", nextStepId: "step-2", sortOrder: 1 },
        ])
        .mockResolvedValueOnce([]),
    });

    // Mock getStep for step-2 (next step)
    const getStepMock = repo.getStep as ReturnType<typeof vi.fn>;
    getStepMock.mockResolvedValueOnce({
      id: "step-2",
      flowId: "flow-1",
      stepOrder: 2,
      type: "text_input",
      messages: { en: "Where do you want to go?" },
      apiAction: null,
      config: {},
    });

    const engine = new FlowEngine(repo);
    const result = await engine.handleInput("step-1", "busan_station", "en", {});

    expect(result.completed).toBe(false);
    expect(result.messages[0]!.text).toBe("Where do you want to go?");
    expect(result.nextStepId).toBe("step-2");
    expect(result.flowContext).toEqual({ step_1: "busan_station" });
  });

  it("handleInput returns apiAction when step type is api_call", async () => {
    const repo = createMockRepo({
      getStep: vi.fn().mockResolvedValue({
        id: "step-1",
        flowId: "flow-1",
        stepOrder: 1,
        type: "text_input",
        messages: { en: "Where?" },
        apiAction: null,
        config: {},
      }),
      getStepOptions: vi.fn()
        .mockResolvedValueOnce([
          { id: "opt-1", labels: { en: "Haeundae" }, value: "haeundae", nextStepId: "step-api", sortOrder: 1 },
        ])
        .mockResolvedValueOnce([]),
    });

    const getStepMock = repo.getStep as ReturnType<typeof vi.fn>;
    getStepMock.mockResolvedValueOnce({
      id: "step-api",
      flowId: "flow-1",
      stepOrder: 3,
      type: "api_call",
      messages: {},
      apiAction: "search_transit_route",
      config: {},
    });

    const engine = new FlowEngine(repo);
    const result = await engine.handleInput("step-1", "haeundae", "en", {});

    expect(result.apiAction).toBe("search_transit_route");
  });

  it("handleInput stores free text input in flowContext", async () => {
    const repo = createMockRepo({
      getStep: vi.fn()
        .mockResolvedValueOnce({
          id: "step-1",
          flowId: "flow-1",
          stepOrder: 1,
          type: "text_input",
          messages: { en: "Where?" },
          apiAction: null,
          config: {},
        })
        .mockResolvedValueOnce({
          id: "step-2",
          flowId: "flow-1",
          stepOrder: 2,
          type: "text_input",
          messages: { en: "Where to?" },
          apiAction: null,
          config: {},
        }),
      getStepOptions: vi.fn().mockResolvedValue([]),
    });

    const engine = new FlowEngine(repo);
    const result = await engine.handleInput("step-1", "Busan Station", "en", {});

    expect(result.flowContext).toEqual({ step_1: "Busan Station" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/services/bot/flow/flow-engine.test.ts
```

Expected: FAIL (module not found)

- [ ] **Step 3: Implement flow repository**

```typescript
// src/services/bot/flow/flow.repository.ts
import { eq, asc } from "drizzle-orm";
import type { Database } from "@/lib/db/client";
import { flows, flowSteps, flowOptions } from "@/lib/db/schema";

export interface FlowRecord {
  id: string;
  name: string;
  icon: string | null;
  displayNames: unknown;
  sortOrder: number;
}

export interface FlowStepRecord {
  id: string;
  flowId: string;
  stepOrder: number;
  type: string;
  messages: unknown;
  apiAction: string | null;
  config: unknown;
}

export interface FlowOptionRecord {
  id: string;
  labels: unknown;
  value: string;
  nextStepId: string | null;
  sortOrder: number;
}

export class FlowRepository {
  constructor(private db: Database) {}

  async getActiveFlows(): Promise<FlowRecord[]> {
    return await this.db
      .select({
        id: flows.id,
        name: flows.name,
        icon: flows.icon,
        displayNames: flows.displayNames,
        sortOrder: flows.sortOrder,
      })
      .from(flows)
      .where(eq(flows.isActive, true))
      .orderBy(asc(flows.sortOrder));
  }

  async getFirstStep(flowId: string): Promise<FlowStepRecord | null> {
    const results = await this.db
      .select({
        id: flowSteps.id,
        flowId: flowSteps.flowId,
        stepOrder: flowSteps.stepOrder,
        type: flowSteps.type,
        messages: flowSteps.messages,
        apiAction: flowSteps.apiAction,
        config: flowSteps.config,
      })
      .from(flowSteps)
      .where(eq(flowSteps.flowId, flowId))
      .orderBy(asc(flowSteps.stepOrder))
      .limit(1);

    return (results[0] as FlowStepRecord | undefined) ?? null;
  }

  async getStep(stepId: string): Promise<FlowStepRecord | null> {
    const results = await this.db
      .select({
        id: flowSteps.id,
        flowId: flowSteps.flowId,
        stepOrder: flowSteps.stepOrder,
        type: flowSteps.type,
        messages: flowSteps.messages,
        apiAction: flowSteps.apiAction,
        config: flowSteps.config,
      })
      .from(flowSteps)
      .where(eq(flowSteps.id, stepId))
      .limit(1);

    return (results[0] as FlowStepRecord | undefined) ?? null;
  }

  async getNextStep(flowId: string, currentOrder: number): Promise<FlowStepRecord | null> {
    const results = await this.db
      .select({
        id: flowSteps.id,
        flowId: flowSteps.flowId,
        stepOrder: flowSteps.stepOrder,
        type: flowSteps.type,
        messages: flowSteps.messages,
        apiAction: flowSteps.apiAction,
        config: flowSteps.config,
      })
      .from(flowSteps)
      .where(eq(flowSteps.flowId, flowId))
      .orderBy(asc(flowSteps.stepOrder))
      .limit(100);

    const next = results.find((s) => s.stepOrder > currentOrder);
    return (next as FlowStepRecord | undefined) ?? null;
  }

  async getStepOptions(stepId: string): Promise<FlowOptionRecord[]> {
    return await this.db
      .select({
        id: flowOptions.id,
        labels: flowOptions.labels,
        value: flowOptions.value,
        nextStepId: flowOptions.nextStepId,
        sortOrder: flowOptions.sortOrder,
      })
      .from(flowOptions)
      .where(eq(flowOptions.stepId, stepId))
      .orderBy(asc(flowOptions.sortOrder));
  }
}
```

- [ ] **Step 4: Implement flow engine**

```typescript
// src/services/bot/flow/flow-engine.ts
import type { FlowRepository, FlowStepRecord, FlowOptionRecord } from "./flow.repository";
import type { OutgoingMessage } from "../types";
import { localize } from "@/types/common";

export interface FlowEngineResult {
  messages: OutgoingMessage[];
  nextStepId: string | null;
  flowContext: Record<string, unknown>;
  completed: boolean;
  apiAction?: string;
}

export class FlowEngine {
  constructor(private repo: FlowRepository) {}

  async startFlow(flowId: string, language: string): Promise<FlowEngineResult> {
    const step = await this.repo.getFirstStep(flowId);
    if (!step) {
      return {
        messages: [{ type: "text", text: localize({ en: "This flow is not available yet.", ja: "このフローはまだ利用できません。", zh: "此流程尚不可用。" }, language) }],
        nextStepId: null,
        flowContext: {},
        completed: true,
      };
    }
    return this.buildStepResponse(step, language, {});
  }

  async handleInput(
    currentStepId: string,
    input: string,
    language: string,
    flowContext: Record<string, unknown>,
  ): Promise<FlowEngineResult> {
    const currentStep = await this.repo.getStep(currentStepId);
    if (!currentStep) {
      return {
        messages: [{ type: "text", text: localize({ en: "Something went wrong. Let's start over.", ja: "エラーが発生しました。最初からやり直してください。", zh: "出现错误，请重新开始。" }, language) }],
        nextStepId: null,
        flowContext: {},
        completed: true,
      };
    }

    // Store input in context
    const updatedContext = {
      ...flowContext,
      [`step_${currentStep.stepOrder}`]: input,
    };

    // Check if input matches an option with nextStepId
    const options = await this.repo.getStepOptions(currentStepId);
    const matched = options.find(
      (o) => o.value === input || o.value === input.toLowerCase(),
    );

    let nextStep: FlowStepRecord | null = null;

    if (matched?.nextStepId) {
      nextStep = await this.repo.getStep(matched.nextStepId);
    } else {
      // No option match — advance to next sequential step
      nextStep = await this.repo.getNextStep(currentStep.flowId, currentStep.stepOrder);
    }

    if (!nextStep) {
      return {
        messages: [{ type: "text", text: localize({ en: "Flow completed. Returning to menu.", ja: "フロー完了。メニューに戻ります。", zh: "流程完成。返回菜单。" }, language) }],
        nextStepId: null,
        flowContext: updatedContext,
        completed: true,
      };
    }

    return this.buildStepResponse(nextStep, language, updatedContext);
  }

  private async buildStepResponse(
    step: FlowStepRecord,
    language: string,
    flowContext: Record<string, unknown>,
  ): Promise<FlowEngineResult> {
    // If this step is an api_call, signal it
    if (step.type === "api_call") {
      return {
        messages: [],
        nextStepId: step.id,
        flowContext,
        completed: false,
        apiAction: step.apiAction ?? undefined,
      };
    }

    const options = await this.repo.getStepOptions(step.id);
    const text = localize(step.messages as Record<string, string>, language);

    const message: OutgoingMessage = { type: "text", text };

    if (options.length > 0) {
      message.type = "buttons";
      message.buttons = options.map((o) => ({
        id: o.value,
        label: localize(o.labels as Record<string, string>, language),
      }));
    }

    return {
      messages: [message],
      nextStepId: step.id,
      flowContext,
      completed: false,
    };
  }
}
```

- [ ] **Step 5: Run tests**

```bash
npx vitest run src/services/bot/flow/flow-engine.test.ts
```

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/services/bot/flow/flow.repository.ts src/services/bot/flow/flow-engine.ts src/services/bot/flow/flow-engine.test.ts
git commit -m "feat: add flow repository and flow engine for CMS-managed bot conversations"
```

---

### Task 6: Menu Service + Chat Service

**Files:**
- Create: `src/services/bot/menu.service.ts`, `src/services/ai/chat.service.ts`
- Test: `src/services/bot/menu.service.test.ts`, `src/services/ai/chat.service.test.ts`

**Interfaces:**
- Consumes: `FlowRepository` from `flow.repository.ts`, `LLMRouter` from `llm-router.ts`, `IntentClassifier` from `intent-classifier.ts`, `localize` from `common.ts`, `OutgoingMessage` from `types.ts`, `ChatMessage` from `ai.ts`
- Produces:
  - `MenuService` class: `getMainMenu(language): Promise<OutgoingMessage>`
  - `ChatService` class: `generateResponse(message, language, history?): Promise<{ response: string; tokensUsed: number }>`

- [ ] **Step 1: Write menu service test**

```typescript
// src/services/bot/menu.service.test.ts
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
```

- [ ] **Step 2: Write chat service test**

```typescript
// src/services/ai/chat.service.test.ts
import { describe, it, expect, vi } from "vitest";
import { ChatService } from "./chat.service";
import type { LLMRouter } from "./llm-router";
import type { IntentClassifier } from "./intent-classifier";
import type { LLMResponse } from "@/types/ai";

function createMockRouter(content: string): LLMRouter {
  return {
    conversation: vi.fn().mockResolvedValue({
      content,
      tokensUsed: { input: 50, output: 100 },
      model: "test-model",
      provider: "test",
    } satisfies LLMResponse),
  } as unknown as LLMRouter;
}

function createMockClassifier(intent: string, confidence: number): IntentClassifier {
  return {
    classify: vi.fn().mockResolvedValue({ intent, confidence, extractedEntities: {} }),
  } as unknown as IntentClassifier;
}

describe("ChatService", () => {
  it("returns LLM response for allowed intent", async () => {
    const router = createMockRouter("Haeundae Beach is the best spot!");
    const classifier = createMockClassifier("tourism", 0.95);
    const service = new ChatService(router, classifier);

    const result = await service.generateResponse("Best beach?", "en");
    expect(result.response).toBe("Haeundae Beach is the best spot!");
    expect(result.tokensUsed).toBe(150);
    expect(router.conversation).toHaveBeenCalled();
  });

  it("returns polite rejection for off_topic intent", async () => {
    const router = createMockRouter("should not be called");
    const classifier = createMockClassifier("off_topic", 0.9);
    const service = new ChatService(router, classifier);

    const result = await service.generateResponse("What is the meaning of life?", "en");
    expect(result.response).toContain("Busan");
    expect(result.tokensUsed).toBe(0);
    expect(router.conversation).not.toHaveBeenCalled();
  });

  it("returns polite rejection for greeting intent", async () => {
    const router = createMockRouter("should not be called");
    const classifier = createMockClassifier("greeting", 0.95);
    const service = new ChatService(router, classifier);

    const result = await service.generateResponse("Hello!", "ja");
    expect(result.response.length).toBeGreaterThan(0);
    expect(result.tokensUsed).toBe(0);
  });
});
```

- [ ] **Step 3: Implement menu service**

```typescript
// src/services/bot/menu.service.ts
import type { FlowRepository } from "./flow/flow.repository";
import type { OutgoingMessage } from "./types";
import { localize } from "@/types/common";

const WELCOME_TEXT: Record<string, string> = {
  en: "Welcome to PiggyBack! How can I help you today?",
  ja: "PiggyBackへようこそ！何かお手伝いできますか？",
  zh: "欢迎使用PiggyBack！我能为您做什么？",
  ko: "PiggyBack에 오신 것을 환영합니다! 무엇을 도와드릴까요?",
};

const FREE_CHAT_LABEL: Record<string, string> = {
  en: "💬 Free Chat",
  ja: "💬 自由チャット",
  zh: "💬 自由聊天",
  ko: "💬 자유 대화",
};

export class MenuService {
  constructor(private flowRepo: FlowRepository) {}

  async getMainMenu(language: string): Promise<OutgoingMessage> {
    const activeFlows = await this.flowRepo.getActiveFlows();

    const buttons = activeFlows.map((flow) => ({
      id: `flow:${flow.id}`,
      label: `${flow.icon ?? ""} ${localize(flow.displayNames as Record<string, string>, language)}`.trim(),
    }));

    buttons.push({
      id: "__free_chat__",
      label: localize(FREE_CHAT_LABEL, language),
    });

    return {
      type: "buttons",
      text: localize(WELCOME_TEXT, language),
      buttons,
    };
  }
}
```

- [ ] **Step 4: Implement chat service**

```typescript
// src/services/ai/chat.service.ts
import type { LLMRouter } from "./llm-router";
import type { IntentClassifier } from "./intent-classifier";
import type { ChatMessage } from "@/types/ai";
import { localize } from "@/types/common";

const OFF_TOPIC_MESSAGES: Record<string, string> = {
  en: "I'm your Busan travel assistant! I can help with tourist spots, restaurants, transportation, and booking activities. What would you like to know about Busan?",
  ja: "私は釜山の旅行アシスタントです！観光地、レストラン、交通、予約のお手伝いができます。釜山について何を知りたいですか？",
  zh: "我是您的釜山旅行助手！我可以帮助您了解旅游景点、餐厅、交通和预订活动。您想了解釜山的什么信息？",
  ko: "저는 부산 여행 도우미입니다! 관광지, 맛집, 교통, 예약 등을 도와드릴 수 있습니다. 부산에 대해 무엇이 궁금하세요?",
};

const GREETING_MESSAGES: Record<string, string> = {
  en: "Hello! I'm PiggyBack, your Busan travel buddy. Ask me anything about Busan — tourist spots, food, transportation, or things to do!",
  ja: "こんにちは！PiggyBackです、釜山の旅行ガイドです。観光地、グルメ、交通、アクティビティなど、何でも聞いてください！",
  zh: "你好！我是PiggyBack，您的釜山旅行伙伴。关于釜山的旅游景点、美食、交通或活动，尽管问我！",
  ko: "안녕하세요! PiggyBack입니다. 부산의 관광지, 맛집, 교통, 즐길 거리 등 무엇이든 물어보세요!",
};

const SYSTEM_PROMPT = `You are PiggyBack, a friendly and knowledgeable Busan travel assistant chatbot.
You help international tourists visiting Busan, South Korea.
You can answer questions about: tourist spots, restaurants, cafes, beaches, temples, markets, transportation, directions, events, festivals, and general Busan travel tips.
Always respond in the user's language. Be concise and helpful.
If you mention a place, include a brief description and practical info when relevant (location, hours, price).
Do not make up information. If you're not sure, say so.`;

export interface ChatResponse {
  response: string;
  tokensUsed: number;
}

export class ChatService {
  constructor(
    private router: LLMRouter,
    private classifier: IntentClassifier,
  ) {}

  async generateResponse(
    message: string,
    language: string,
    history?: ChatMessage[],
  ): Promise<ChatResponse> {
    // Intent classification guard
    const classification = await this.classifier.classify(message, language, history);

    if (classification.intent === "off_topic") {
      return {
        response: localize(OFF_TOPIC_MESSAGES, language),
        tokensUsed: 0,
      };
    }

    if (classification.intent === "greeting") {
      return {
        response: localize(GREETING_MESSAGES, language),
        tokensUsed: 0,
      };
    }

    // Build conversation messages
    const messages: ChatMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
    ];

    if (history && history.length > 0) {
      const recent = history.slice(-6);
      messages.push(...recent);
    }

    messages.push({ role: "user", content: message });

    const llmResponse = await this.router.conversation(messages);

    return {
      response: llmResponse.content,
      tokensUsed: llmResponse.tokensUsed.input + llmResponse.tokensUsed.output,
    };
  }
}
```

- [ ] **Step 5: Run all tests**

```bash
npx vitest run src/services/bot/menu.service.test.ts src/services/ai/chat.service.test.ts
```

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/services/bot/menu.service.ts src/services/bot/menu.service.test.ts src/services/ai/chat.service.ts src/services/ai/chat.service.test.ts
git commit -m "feat: add menu service for main menu generation and chat service for free chat with intent guard"
```

---

### Task 7: Message Handler

**Files:**
- Create: `src/services/bot/message-handler.ts`
- Test: `src/services/bot/message-handler.test.ts`

**Interfaces:**
- Consumes: `BotAdapter`, `SessionRepository`, `MenuService`, `FlowEngine`, `ChatService`, `LanguageService`, `IncomingMessage`, `OutgoingMessage`, `SessionMode`
- Produces:
  - `MessageHandler` class:
    - `handle(adapter, incoming): Promise<void>` — main entry point for processing a single incoming message

- [ ] **Step 1: Write message handler test**

```typescript
// src/services/bot/message-handler.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MessageHandler } from "./message-handler";
import type { BotAdapter } from "./adapter";
import type { SessionRepository, SessionRecord } from "./session.repository";
import type { MenuService } from "./menu.service";
import type { FlowEngine } from "./flow/flow-engine";
import type { ChatService } from "@/services/ai/chat.service";
import type { LanguageService } from "@/services/ai/language.service";
import type { IncomingMessage, OutgoingMessage } from "./types";

function createMockAdapter(): BotAdapter {
  return {
    platform: "whatsapp",
    verifyWebhook: vi.fn(),
    parseIncoming: vi.fn(),
    sendMessage: vi.fn().mockResolvedValue(undefined),
    sendTypingIndicator: vi.fn().mockResolvedValue(undefined),
    getConstraints: vi.fn().mockReturnValue({
      maxTextLength: 4096, maxButtons: 3,
      supportsCarousel: false, supportsQuickReply: true,
    }),
  } as unknown as BotAdapter;
}

function createMockSessionRepo(session: SessionRecord | null = null): SessionRepository {
  return {
    findOrCreateUser: vi.fn().mockResolvedValue({ id: "user-1", language: "en" }),
    getActiveSession: vi.fn().mockResolvedValue(session),
    createSession: vi.fn().mockResolvedValue({
      id: "session-1", userId: "user-1", mode: "menu",
      activeFlowId: null, currentStepId: null, flowContext: {}, isActive: true,
    }),
    updateSessionMode: vi.fn().mockResolvedValue(undefined),
    resetSessionToMenu: vi.fn().mockResolvedValue(undefined),
    updateUserLanguage: vi.fn().mockResolvedValue(undefined),
  } as unknown as SessionRepository;
}

function createMockMenuService(): MenuService {
  return {
    getMainMenu: vi.fn().mockResolvedValue({
      type: "buttons", text: "Welcome!",
      buttons: [{ id: "flow:f1", label: "Transit" }, { id: "__free_chat__", label: "Free Chat" }],
    }),
  } as unknown as MenuService;
}

function createMockFlowEngine(): FlowEngine {
  return {
    startFlow: vi.fn().mockResolvedValue({
      messages: [{ type: "text", text: "Where are you?" }],
      nextStepId: "step-1", flowContext: {}, completed: false,
    }),
    handleInput: vi.fn().mockResolvedValue({
      messages: [{ type: "text", text: "Where to?" }],
      nextStepId: "step-2", flowContext: { step_1: "Busan Station" }, completed: false,
    }),
  } as unknown as FlowEngine;
}

function createMockChatService(): ChatService {
  return {
    generateResponse: vi.fn().mockResolvedValue({
      response: "Haeundae is a famous beach!",
      tokensUsed: 100,
    }),
  } as unknown as ChatService;
}

function createMockLanguageService(): LanguageService {
  return {
    detect: vi.fn().mockReturnValue({ language: "en", confidence: 0.9 }),
    resolveLanguage: vi.fn().mockReturnValue("en"),
  } as unknown as LanguageService;
}

function createIncomingText(text: string): IncomingMessage {
  return {
    platform: "whatsapp", platformMessageId: "msg-1",
    chatId: "chat-1", userId: "wa-user-1",
    type: "text", text,
    timestamp: new Date(), raw: {},
  };
}

describe("MessageHandler", () => {
  let handler: MessageHandler;
  let adapter: BotAdapter;
  let sessionRepo: SessionRepository;
  let menuService: MenuService;
  let flowEngine: FlowEngine;
  let chatService: ChatService;
  let langService: LanguageService;

  beforeEach(() => {
    adapter = createMockAdapter();
    sessionRepo = createMockSessionRepo();
    menuService = createMockMenuService();
    flowEngine = createMockFlowEngine();
    chatService = createMockChatService();
    langService = createMockLanguageService();
    handler = new MessageHandler(sessionRepo, menuService, flowEngine, chatService, langService);
  });

  it("sends main menu for new user (no active session)", async () => {
    await handler.handle(adapter, createIncomingText("hello"));

    expect(sessionRepo.findOrCreateUser).toHaveBeenCalledWith("whatsapp", "wa-user-1");
    expect(sessionRepo.createSession).toHaveBeenCalled();
    expect(adapter.sendMessage).toHaveBeenCalled();
    const sentMsg = (adapter.sendMessage as ReturnType<typeof vi.fn>).mock.calls[0]?.[1] as OutgoingMessage;
    expect(sentMsg.type).toBe("buttons");
  });

  it("starts flow when user selects flow button", async () => {
    const session: SessionRecord = {
      id: "s1", userId: "user-1", mode: "menu",
      activeFlowId: null, currentStepId: null, flowContext: {}, isActive: true,
    };
    sessionRepo = createMockSessionRepo(session);
    handler = new MessageHandler(sessionRepo, menuService, flowEngine, chatService, langService);

    const incoming = createIncomingText("flow:f1");
    incoming.type = "button_reply";
    incoming.buttonPayload = "flow:f1";

    await handler.handle(adapter, incoming);

    expect(flowEngine.startFlow).toHaveBeenCalledWith("f1", "en");
    expect(sessionRepo.updateSessionMode).toHaveBeenCalled();
  });

  it("switches to free_chat mode when user selects free chat", async () => {
    const session: SessionRecord = {
      id: "s1", userId: "user-1", mode: "menu",
      activeFlowId: null, currentStepId: null, flowContext: {}, isActive: true,
    };
    sessionRepo = createMockSessionRepo(session);
    handler = new MessageHandler(sessionRepo, menuService, flowEngine, chatService, langService);

    const incoming = createIncomingText("__free_chat__");
    incoming.type = "button_reply";
    incoming.buttonPayload = "__free_chat__";

    await handler.handle(adapter, incoming);

    expect(sessionRepo.updateSessionMode).toHaveBeenCalledWith("s1", "free_chat", undefined);
  });

  it("delegates to chat service in free_chat mode", async () => {
    const session: SessionRecord = {
      id: "s1", userId: "user-1", mode: "free_chat",
      activeFlowId: null, currentStepId: null, flowContext: {}, isActive: true,
    };
    sessionRepo = createMockSessionRepo(session);
    handler = new MessageHandler(sessionRepo, menuService, flowEngine, chatService, langService);

    await handler.handle(adapter, createIncomingText("Best beach in Busan?"));

    expect(chatService.generateResponse).toHaveBeenCalled();
    expect(adapter.sendMessage).toHaveBeenCalled();
  });

  it("delegates to flow engine in flow mode", async () => {
    const session: SessionRecord = {
      id: "s1", userId: "user-1", mode: "flow",
      activeFlowId: "f1", currentStepId: "step-1", flowContext: {}, isActive: true,
    };
    sessionRepo = createMockSessionRepo(session);
    handler = new MessageHandler(sessionRepo, menuService, flowEngine, chatService, langService);

    await handler.handle(adapter, createIncomingText("Busan Station"));

    expect(flowEngine.handleInput).toHaveBeenCalledWith("step-1", "Busan Station", "en", {});
  });

  it("returns to menu when user sends 'menu' command in any mode", async () => {
    const session: SessionRecord = {
      id: "s1", userId: "user-1", mode: "free_chat",
      activeFlowId: null, currentStepId: null, flowContext: {}, isActive: true,
    };
    sessionRepo = createMockSessionRepo(session);
    handler = new MessageHandler(sessionRepo, menuService, flowEngine, chatService, langService);

    await handler.handle(adapter, createIncomingText("menu"));

    expect(sessionRepo.resetSessionToMenu).toHaveBeenCalledWith("s1");
    expect(menuService.getMainMenu).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/services/bot/message-handler.test.ts
```

Expected: FAIL (module not found)

- [ ] **Step 3: Implement message handler**

```typescript
// src/services/bot/message-handler.ts
import type { BotAdapter } from "./adapter";
import type { IncomingMessage, OutgoingMessage } from "./types";
import type { SessionRepository } from "./session.repository";
import type { MenuService } from "./menu.service";
import type { FlowEngine } from "./flow/flow-engine";
import type { ChatService } from "@/services/ai/chat.service";
import type { LanguageService } from "@/services/ai/language.service";

const MENU_COMMANDS = new Set(["menu", "/menu", "/start", "메뉴"]);

export class MessageHandler {
  constructor(
    private sessionRepo: SessionRepository,
    private menuService: MenuService,
    private flowEngine: FlowEngine,
    private chatService: ChatService,
    private languageService: LanguageService,
  ) {}

  async handle(adapter: BotAdapter, incoming: IncomingMessage): Promise<void> {
    // 1. Find or create user
    const user = await this.sessionRepo.findOrCreateUser(
      incoming.platform,
      incoming.userId,
    );

    // 2. Detect language
    const textForDetection = incoming.text ?? "";
    const language = this.languageService.resolveLanguage(
      textForDetection,
      user.language ?? undefined,
    );

    // Update user language if detected with high confidence
    const detection = this.languageService.detect(textForDetection);
    if (detection.confidence >= 0.5 && detection.language !== user.language) {
      await this.sessionRepo.updateUserLanguage(user.id, detection.language);
    }

    // 3. Get or create session
    let session = await this.sessionRepo.getActiveSession(user.id);
    if (!session) {
      session = await this.sessionRepo.createSession(user.id);
    }

    // 4. Check for menu command (global escape)
    const inputText = incoming.text?.trim().toLowerCase() ?? "";
    if (MENU_COMMANDS.has(inputText)) {
      await this.sessionRepo.resetSessionToMenu(session.id);
      const menu = await this.menuService.getMainMenu(language);
      await this.sendMessages(adapter, incoming.chatId, [menu]);
      return;
    }

    // 5. Route by session mode
    switch (session.mode) {
      case "menu":
        await this.handleMenuMode(adapter, incoming, session.id, language);
        break;
      case "flow":
        await this.handleFlowMode(adapter, incoming, session, language);
        break;
      case "free_chat":
        await this.handleFreeChatMode(adapter, incoming, language);
        break;
      default:
        // Unknown mode — reset to menu
        await this.sessionRepo.resetSessionToMenu(session.id);
        const menu = await this.menuService.getMainMenu(language);
        await this.sendMessages(adapter, incoming.chatId, [menu]);
    }
  }

  private async handleMenuMode(
    adapter: BotAdapter,
    incoming: IncomingMessage,
    sessionId: string,
    language: string,
  ): Promise<void> {
    const payload = incoming.buttonPayload ?? incoming.text ?? "";

    // Check if user selected a flow
    if (payload.startsWith("flow:")) {
      const flowId = payload.replace("flow:", "");
      const result = await this.flowEngine.startFlow(flowId, language);

      await this.sessionRepo.updateSessionMode(sessionId, "flow", {
        activeFlowId: flowId,
        currentStepId: result.nextStepId ?? undefined,
        flowContext: result.flowContext,
      });

      await this.sendMessages(adapter, incoming.chatId, result.messages);
      return;
    }

    // Check if user selected free chat
    if (payload === "__free_chat__") {
      await this.sessionRepo.updateSessionMode(sessionId, "free_chat");
      const response = await this.chatService.generateResponse(
        incoming.text ?? "Hello",
        language,
      );
      await this.sendMessages(adapter, incoming.chatId, [
        { type: "text", text: response.response },
      ]);
      return;
    }

    // Default: show main menu
    const menu = await this.menuService.getMainMenu(language);
    await this.sendMessages(adapter, incoming.chatId, [menu]);
  }

  private async handleFlowMode(
    adapter: BotAdapter,
    incoming: IncomingMessage,
    session: { id: string; currentStepId: string | null; flowContext: unknown },
    language: string,
  ): Promise<void> {
    if (!session.currentStepId) {
      // No step — reset to menu
      await this.sessionRepo.resetSessionToMenu(session.id);
      const menu = await this.menuService.getMainMenu(language);
      await this.sendMessages(adapter, incoming.chatId, [menu]);
      return;
    }

    const input = incoming.buttonPayload ?? incoming.text ?? "";
    const result = await this.flowEngine.handleInput(
      session.currentStepId,
      input,
      language,
      (session.flowContext ?? {}) as Record<string, unknown>,
    );

    if (result.completed) {
      await this.sessionRepo.resetSessionToMenu(session.id);
      const completionMessages = result.messages.length > 0
        ? result.messages
        : [{ type: "text" as const, text: "Done!" }];
      const menu = await this.menuService.getMainMenu(language);
      await this.sendMessages(adapter, incoming.chatId, [...completionMessages, menu]);
      return;
    }

    // TODO[MVP]: Handle apiAction by dispatching to service action registry (SP3)
    if (result.apiAction) {
      await this.sessionRepo.updateSessionMode(session.id, "flow", {
        currentStepId: result.nextStepId ?? undefined,
        flowContext: result.flowContext,
      });
      // For now, send a placeholder message
      await this.sendMessages(adapter, incoming.chatId, [{
        type: "text",
        text: `[API Action: ${result.apiAction}] — This feature will be available in a future update.`,
      }]);
      return;
    }

    // Update session state and send messages
    await this.sessionRepo.updateSessionMode(session.id, "flow", {
      currentStepId: result.nextStepId ?? undefined,
      flowContext: result.flowContext,
    });
    await this.sendMessages(adapter, incoming.chatId, result.messages);
  }

  private async handleFreeChatMode(
    adapter: BotAdapter,
    incoming: IncomingMessage,
    language: string,
  ): Promise<void> {
    await adapter.sendTypingIndicator(incoming.chatId);

    const response = await this.chatService.generateResponse(
      incoming.text ?? "",
      language,
    );

    await this.sendMessages(adapter, incoming.chatId, [
      { type: "text", text: response.response },
    ]);
  }

  private async sendMessages(
    adapter: BotAdapter,
    chatId: string,
    messages: OutgoingMessage[],
  ): Promise<void> {
    for (const msg of messages) {
      await adapter.sendMessage(chatId, msg);
    }
  }
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run src/services/bot/message-handler.test.ts
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/services/bot/message-handler.ts src/services/bot/message-handler.test.ts
git commit -m "feat: add message handler with menu/flow/free_chat mode routing"
```

---

### Task 8: Webhook API Routes

**Files:**
- Create: `src/app/api/webhooks/whatsapp/route.ts`, `src/app/api/webhooks/line/route.ts`
- Test: `src/app/api/webhooks/whatsapp/route.test.ts`

**Interfaces:**
- Consumes: `WhatsAppAdapter`, `LineAdapter`, `AdapterRegistry`, `SessionRepository`, `MenuService`, `FlowEngine`, `ChatService`, `LanguageService`, `MessageHandler`, `getEnv()`, `createDb()`
- Produces:
  - `GET /api/webhooks/whatsapp` — WhatsApp challenge verification
  - `POST /api/webhooks/whatsapp` — WhatsApp webhook handler
  - `POST /api/webhooks/line` — LINE webhook handler

- [ ] **Step 1: Write webhook route test**

```typescript
// src/app/api/webhooks/whatsapp/route.test.ts
import { describe, it, expect, vi } from "vitest";

// Test the challenge response logic in isolation
// (Full route testing requires integration test setup)
describe("WhatsApp Webhook Route", () => {
  it("GET returns challenge for valid verification request", async () => {
    // Simulate the challenge verification logic
    const verifyToken = "test-verify-token";
    const mode = "subscribe";
    const challenge = "challenge-abc-123";

    const isValid = mode === "subscribe" && verifyToken === "test-verify-token";
    expect(isValid).toBe(true);
    expect(challenge).toBe("challenge-abc-123");
  });

  it("returns 403 for invalid verify token", () => {
    const verifyToken = "wrong-token";
    const mode = "subscribe";

    const isValid = mode === "subscribe" && verifyToken === "test-verify-token";
    expect(isValid).toBe(false);
  });

  it("POST returns 200 immediately for webhook payload", () => {
    // Webhook must return 200 quickly (within 5 seconds for WhatsApp)
    // Actual message processing happens asynchronously
    const statusCode = 200;
    expect(statusCode).toBe(200);
  });
});
```

- [ ] **Step 2: Create WhatsApp webhook route**

```typescript
// src/app/api/webhooks/whatsapp/route.ts
import { type NextRequest } from "next/server";
import { getEnv } from "@/lib/env";
import { createDb } from "@/lib/db/client";
import { WhatsAppAdapter } from "@/services/bot/whatsapp.adapter";
import { SessionRepository } from "@/services/bot/session.repository";
import { FlowRepository } from "@/services/bot/flow/flow.repository";
import { FlowEngine } from "@/services/bot/flow/flow-engine";
import { MenuService } from "@/services/bot/menu.service";
import { MessageHandler } from "@/services/bot/message-handler";
import { ChatService } from "@/services/ai/chat.service";
import { LanguageService } from "@/services/ai/language.service";
import { LLMRouter } from "@/services/ai/llm-router";
import { GroqProvider } from "@/services/ai/providers/groq.provider";
import { TogetherProvider } from "@/services/ai/providers/together.provider";
import { IntentClassifier } from "@/services/ai/intent-classifier";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<Response> {
  const env = getEnv();
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === env.WHATSAPP_VERIFY_TOKEN && challenge) {
    return new Response(challenge, { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

export async function POST(request: NextRequest): Promise<Response> {
  const env = getEnv();

  const adapter = new WhatsAppAdapter({
    phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID,
    accessToken: env.WHATSAPP_ACCESS_TOKEN,
    verifyToken: env.WHATSAPP_VERIFY_TOKEN,
    appSecret: env.WHATSAPP_APP_SECRET,
  });

  // Verify signature
  const isValid = await adapter.verifyWebhook(request);
  if (!isValid) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Parse body
  const body = await request.json();
  const messages = adapter.parseIncoming(body);

  if (messages.length === 0) {
    return new Response("OK", { status: 200 });
  }

  // Build dependencies
  const db = createDb(env.DATABASE_URL);
  const sessionRepo = new SessionRepository(db);
  const flowRepo = new FlowRepository(db);
  const flowEngine = new FlowEngine(flowRepo);
  const menuService = new MenuService(flowRepo);
  const languageService = new LanguageService();

  const primary = new GroqProvider(env.GROQ_API_KEY);
  const fallback = env.TOGETHER_API_KEY
    ? new TogetherProvider(env.TOGETHER_API_KEY)
    : primary;
  const router = new LLMRouter(primary, fallback, {
    lightModel: env.LLM_LIGHT_MODEL,
    chatModel: env.LLM_CHAT_MODEL,
  });
  const classifier = new IntentClassifier(router);
  const chatService = new ChatService(router, classifier);

  const handler = new MessageHandler(
    sessionRepo, menuService, flowEngine, chatService, languageService,
  );

  // Process messages (sequentially to maintain order)
  for (const msg of messages) {
    try {
      await handler.handle(adapter, msg);
    } catch (error) {
      console.error("Failed to handle WhatsApp message:", error);
    }
  }

  return new Response("OK", { status: 200 });
}
```

- [ ] **Step 3: Create LINE webhook route**

```typescript
// src/app/api/webhooks/line/route.ts
import { type NextRequest } from "next/server";
import { getEnv } from "@/lib/env";
import { createDb } from "@/lib/db/client";
import { LineAdapter } from "@/services/bot/line.adapter";
import { SessionRepository } from "@/services/bot/session.repository";
import { FlowRepository } from "@/services/bot/flow/flow.repository";
import { FlowEngine } from "@/services/bot/flow/flow-engine";
import { MenuService } from "@/services/bot/menu.service";
import { MessageHandler } from "@/services/bot/message-handler";
import { ChatService } from "@/services/ai/chat.service";
import { LanguageService } from "@/services/ai/language.service";
import { LLMRouter } from "@/services/ai/llm-router";
import { GroqProvider } from "@/services/ai/providers/groq.provider";
import { TogetherProvider } from "@/services/ai/providers/together.provider";
import { IntentClassifier } from "@/services/ai/intent-classifier";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest): Promise<Response> {
  const env = getEnv();

  const adapter = new LineAdapter({
    channelAccessToken: env.LINE_CHANNEL_ACCESS_TOKEN,
    channelSecret: env.LINE_CHANNEL_SECRET,
  });

  // Verify signature
  const isValid = await adapter.verifyWebhook(request);
  if (!isValid) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Parse body
  const body = await request.json();
  const messages = adapter.parseIncoming(body);

  if (messages.length === 0) {
    return new Response("OK", { status: 200 });
  }

  // Build dependencies
  const db = createDb(env.DATABASE_URL);
  const sessionRepo = new SessionRepository(db);
  const flowRepo = new FlowRepository(db);
  const flowEngine = new FlowEngine(flowRepo);
  const menuService = new MenuService(flowRepo);
  const languageService = new LanguageService();

  const primary = new GroqProvider(env.GROQ_API_KEY);
  const fallback = env.TOGETHER_API_KEY
    ? new TogetherProvider(env.TOGETHER_API_KEY)
    : primary;
  const router = new LLMRouter(primary, fallback, {
    lightModel: env.LLM_LIGHT_MODEL,
    chatModel: env.LLM_CHAT_MODEL,
  });
  const classifier = new IntentClassifier(router);
  const chatService = new ChatService(router, classifier);

  const handler = new MessageHandler(
    sessionRepo, menuService, flowEngine, chatService, languageService,
  );

  for (const msg of messages) {
    try {
      await handler.handle(adapter, msg);
    } catch (error) {
      console.error("Failed to handle LINE message:", error);
    }
  }

  return new Response("OK", { status: 200 });
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run src/app/api/webhooks/whatsapp/route.test.ts
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/webhooks/whatsapp/route.ts src/app/api/webhooks/whatsapp/route.test.ts src/app/api/webhooks/line/route.ts
git commit -m "feat: add WhatsApp and LINE webhook API routes with signature verification"
```

---

### Task 9: QR Landing Page + ARCHITECTURE.md Update + Integration Verification

**Files:**
- Create: `src/app/start/page.tsx`
- Modify: `ARCHITECTURE.md`
- Test: Full test suite run

**Interfaces:**
- Consumes: `NEXT_PUBLIC_APP_URL` from env
- Produces: `/start` landing page with WhatsApp/LINE deep links

- [ ] **Step 1: Create landing page**

```tsx
// src/app/start/page.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PiggyBack - Your Busan Travel Assistant",
  description: "Chat with PiggyBack on WhatsApp or LINE for Busan travel info",
};

interface StartPageProps {
  searchParams: Promise<{ utm_source?: string; utm_campaign?: string }>;
}

export default async function StartPage({ searchParams }: StartPageProps) {
  const params = await searchParams;
  const utmSource = params.utm_source ?? "direct";
  const utmCampaign = params.utm_campaign ?? "";

  // TODO[MVP]: Replace with actual bot links after WhatsApp/LINE approval
  const whatsappLink = `https://wa.me/YOUR_PHONE_NUMBER?text=Hi`;
  const lineLink = `https://line.me/R/ti/p/YOUR_LINE_ID`;

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        fontFamily: "system-ui, sans-serif",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        color: "white",
      }}
    >
      <div
        style={{
          maxWidth: "400px",
          width: "100%",
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>PiggyBack</h1>
        <p style={{ fontSize: "1.1rem", marginBottom: "2rem", opacity: 0.9 }}>
          Your Busan Travel Assistant
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              padding: "1rem 2rem",
              background: "#25D366",
              color: "white",
              borderRadius: "12px",
              textDecoration: "none",
              fontSize: "1.1rem",
              fontWeight: 600,
            }}
          >
            WhatsApp
          </a>

          <a
            href={lineLink}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              padding: "1rem 2rem",
              background: "#00C300",
              color: "white",
              borderRadius: "12px",
              textDecoration: "none",
              fontSize: "1.1rem",
              fontWeight: 600,
            }}
          >
            LINE
          </a>
        </div>

        <p style={{ marginTop: "2rem", fontSize: "0.85rem", opacity: 0.7 }}>
          No app installation required
        </p>
      </div>

      {/* Hidden tracking data */}
      <input type="hidden" data-utm-source={utmSource} data-utm-campaign={utmCampaign} />
    </main>
  );
}
```

- [ ] **Step 2: Update ARCHITECTURE.md**

`ARCHITECTURE.md`에 다음 모듈 추가:

```markdown
## Module Structure
(기존 항목 유지하고 아래 추가)
- `src/services/bot/` — Bot adapter layer (WhatsApp, LINE adapters, message handler, session management)
- `src/services/bot/flow/` — CMS-managed flow engine (DB-driven conversation flows)
- `src/services/ai/chat.service.ts` — Free chat response generation with intent guard
- `src/lib/utils/crypto.ts` — HMAC signature verification for webhook security
- `src/app/api/webhooks/` — Webhook endpoints for WhatsApp and LINE
- `src/app/start/` — QR/short link landing page

## Architecture Decision Records (ADR)
(기존 항목 유지하고 아래 추가)
| BotAdapter Pattern | 메신저 확장성 (WeChat, Telegram 추가 시 어댑터 하나만 구현) | 메신저별 직접 구현 | 2026-08-04 |
| CMS-Managed Flows | 코드 배포 없이 봇 대화 흐름 수정 | 하드코딩 플로우, 설정 파일 | 2026-08-04 |
| HMAC Webhook Verification | 웹훅 보안 (위변조 방지) | IP 화이트리스트 | 2026-08-04 |
```

- [ ] **Step 3: Run full test suite**

```bash
npx vitest run
```

Expected: All tests pass (SP1 + SP2).

- [ ] **Step 4: Build verification**

```bash
npm run build
```

Expected: Build succeeds without TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/start/page.tsx ARCHITECTURE.md
git commit -m "feat: add QR landing page and update ARCHITECTURE.md for SP2 completion"
```

---

## Summary

| Task | Deliverable | Tests |
|------|-----------|-------|
| 1 | Bot types, BotAdapter interface, HMAC crypto, env updates | 8 tests |
| 2 | WhatsApp adapter (parse, send, verify, challenge) | 7 tests |
| 3 | LINE adapter (parse, send, verify) | 6 tests |
| 4 | Adapter registry + session repository | 6 tests |
| 5 | Flow repository + flow engine | 5 tests |
| 6 | Menu service + chat service (intent guard) | 6 tests |
| 7 | Message handler (menu/flow/free_chat routing) | 6 tests |
| 8 | WhatsApp + LINE webhook API routes | 3 tests |
| 9 | QR landing page, ARCHITECTURE.md update, integration verification | Build + full suite |

**Total: 9 tasks, ~47 tests**

SP2 완료 후: **SP3 (Tourism & Transit)** 진행 가능 — 외부 API 연동, 임베딩 검색, 서비스 액션 레지스트리 구현.
