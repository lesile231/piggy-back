# SP1: Core Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Next.js 프로젝트 초기화, DB 스키마 구축, LLM Provider 추상화, 언어 감지, 3-Stage 지명 매핑 엔진까지 동작하는 Core Foundation 구축.

**Architecture:** Monolithic Next.js 15 (App Router) + Neon Serverless Postgres (Drizzle ORM) + Groq/Together AI. 모든 코드는 `src/` 아래에 서비스 계층(`services/`), 인프라 계층(`lib/`), 타입(`types/`)으로 분리.

**Tech Stack:** Next.js 15, TypeScript strict, Drizzle ORM, Neon Postgres (with pgvector), Groq SDK, Together AI SDK, franc (language detection), Vitest

## Global Constraints

- TypeScript strict mode (`"strict": true` in tsconfig)
- Node.js 20+
- 모든 환경 설정은 환경변수로 관리 (하드코딩 금지)
- `async/await` only (no `.then()` chains)
- 커밋 메시지: conventional commits (`feat:`, `fix:`, `test:`, `chore:`)
- 테스트: Vitest
- 에러 처리: typed errors with `{ ok, data, error }` Result pattern
- 다국어 데이터: JSONB `{ "en": "...", "ja": "...", "zh": "..." }` 형식

---

## File Structure

```
piggy_back/
├── src/
│   ├── types/
│   │   ├── common.ts              # Result, LocalizedText, Platform 등 공통 타입
│   │   ├── db.ts                  # DB 스키마에서 추론된 타입 re-export
│   │   └── ai.ts                  # LLM 관련 타입
│   ├── lib/
│   │   ├── db/
│   │   │   ├── client.ts          # Neon DB 연결 클라이언트
│   │   │   ├── schema.ts          # 전체 Drizzle 스키마 정의
│   │   │   └── seed.ts            # 개발용 시드 데이터
│   │   ├── env.ts                 # 환경변수 검증 (zod)
│   │   └── utils/
│   │       └── crypto.ts          # 해시, HMAC 유틸
│   ├── services/
│   │   └── ai/
│   │       ├── llm-provider.ts    # LLMProvider 인터페이스 + LLMResponse 타입
│   │       ├── llm-router.ts      # 작업별 모델 라우팅 + 폴백
│   │       ├── providers/
│   │       │   ├── groq.provider.ts
│   │       │   └── together.provider.ts
│   │       ├── language.service.ts     # 언어 감지 (franc)
│   │       ├── location-resolver.ts    # 3-Stage 지명 매핑
│   │       ├── embedding.service.ts    # 임베딩 생성/검색
│   │       └── intent-classifier.ts    # 의도 분류 가드
│   └── app/
│       └── layout.tsx             # 루트 레이아웃 (minimal)
├── drizzle.config.ts
├── vitest.config.ts
├── next.config.ts
├── tsconfig.json
├── package.json
├── .env.local.example
├── .gitignore
└── ARCHITECTURE.md
```

---

### Task 1: Project Scaffolding + Config

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `.env.local.example`, `.gitignore`, `src/app/layout.tsx`, `ARCHITECTURE.md`

**Interfaces:**
- Produces: 빌드/테스트가 동작하는 Next.js 프로젝트 기반

- [ ] **Step 1: Initialize Next.js project**

```bash
cd /Users/ibct/Documents/workspace/piggy_back
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

Select: Yes to all defaults. `--src-dir` places code in `src/`.

- [ ] **Step 2: Install core dependencies**

```bash
npm install drizzle-orm @neondatabase/serverless zod franc-min
npm install -D drizzle-kit vitest @vitejs/plugin-react dotenv tsx
```

- [ ] **Step 3: Configure TypeScript strict mode**

Open `tsconfig.json` and verify/add:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

- [ ] **Step 4: Create Vitest config**

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/services/**", "src/lib/**"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

- [ ] **Step 5: Add test script to package.json**

Add to `scripts`:

```json
{
  "test": "vitest run",
  "test:watch": "vitest",
  "db:generate": "drizzle-kit generate",
  "db:migrate": "drizzle-kit migrate",
  "db:studio": "drizzle-kit studio"
}
```

- [ ] **Step 6: Create .env.local.example**

```env
# Database
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require

# AI
GROQ_API_KEY=
TOGETHER_API_KEY=
HF_API_TOKEN=

# AI Model Config
LLM_LIGHT_PROVIDER=groq
LLM_LIGHT_MODEL=llama-3.1-8b-instant
LLM_CHAT_PROVIDER=groq
LLM_CHAT_MODEL=llama-3.3-70b-versatile
```

- [ ] **Step 7: Update .gitignore**

Ensure these entries exist:

```
.env
.env.local
.env.*.local
node_modules/
.next/
```

- [ ] **Step 8: Create ARCHITECTURE.md**

```markdown
# ARCHITECTURE.md

## System Overview
PiggyBack — 부산 외국인 관광 통합 메신저 봇 플랫폼. Next.js 15 monolith on Vercel.

## Module Structure
- `src/app/` — Next.js App Router (pages, API routes)
- `src/services/` — Business logic layer
- `src/lib/` — Infrastructure (DB, external APIs, utils)
- `src/types/` — Shared TypeScript types
- `src/components/` — React components (admin CMS)

## Architecture Decision Records (ADR)
| Decision | Reason | Alternatives | Date |
|----------|--------|-------------|------|
| Monolithic Next.js | 1인 개발, 인프라 최소화 | Turborepo monorepo, NestJS backend | 2026-08-04 |
| Neon Postgres | Vercel 통합, 서버리스 | Supabase, PlanetScale | 2026-08-04 |
| Groq + Together AI | 비용 $5-15/월 vs OpenAI $150-300/월 | OpenAI, self-hosted | 2026-08-04 |
| Drizzle ORM | 타입 안전, 경량, 서버리스 친화 | Prisma, Kysely | 2026-08-04 |

## Invariants (Must Not Change)
- BotAdapter 인터페이스 (메신저 확장성)
- LLMProvider 인터페이스 (AI provider 교체 가능성)
- JSONB 다국어 데이터 형식
```

- [ ] **Step 9: Verify build and test**

```bash
npm run build && npm test
```

Expected: Build succeeds, test suite runs (0 tests found, passes).

- [ ] **Step 10: Commit**

```bash
git init && git add -A && git commit -m "chore: initialize Next.js project with TypeScript strict, Vitest, Drizzle"
```

---

### Task 2: Environment Validation + Common Types

**Files:**
- Create: `src/lib/env.ts`, `src/types/common.ts`, `src/types/ai.ts`
- Test: `src/lib/env.test.ts`, `src/types/common.test.ts`

**Interfaces:**
- Consumes: project config from Task 1
- Produces:
  - `env` object with validated environment variables
  - `Result<T>`, `LocalizedText`, `Platform` types used by all subsequent tasks

- [ ] **Step 1: Write env validation test**

```typescript
// src/lib/env.test.ts
import { describe, it, expect, vi } from "vitest";

describe("env", () => {
  it("should throw if DATABASE_URL is missing", async () => {
    vi.stubEnv("DATABASE_URL", "");
    // Dynamic import to re-evaluate
    await expect(async () => {
      const mod = await import("./env");
      mod.getEnv();
    }).rejects.toThrow();
    vi.unstubAllEnvs();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/lib/env.test.ts
```

Expected: FAIL (module not found)

- [ ] **Step 3: Implement env.ts**

```typescript
// src/lib/env.ts
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  GROQ_API_KEY: z.string().min(1, "GROQ_API_KEY is required"),
  TOGETHER_API_KEY: z.string().default(""),
  HF_API_TOKEN: z.string().default(""),
  LLM_LIGHT_PROVIDER: z.enum(["groq", "together"]).default("groq"),
  LLM_LIGHT_MODEL: z.string().default("llama-3.1-8b-instant"),
  LLM_CHAT_PROVIDER: z.enum(["groq", "together"]).default("groq"),
  LLM_CHAT_MODEL: z.string().default("llama-3.3-70b-versatile"),
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

export function getEnv(): Env {
  if (cachedEnv) return cachedEnv;
  const parsed = envSchema.parse(process.env);
  cachedEnv = parsed;
  return parsed;
}

export function clearEnvCache(): void {
  cachedEnv = null;
}
```

- [ ] **Step 4: Create common types**

```typescript
// src/types/common.ts
export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

export function ok<T>(data: T): Result<T> {
  return { ok: true, data };
}

export function err<T>(code: string, message: string): Result<T> {
  return { ok: false, error: { code, message } };
}

export type Platform = "whatsapp" | "line" | "wechat" | "telegram";

export type LocalizedText = Record<string, string>;
// Usage: { "en": "Hello", "ja": "こんにちは", "zh": "你好" }

export function localize(
  data: LocalizedText,
  lang: string,
  fallback = "en"
): string {
  return data[lang] ?? data[fallback] ?? Object.values(data)[0] ?? "";
}
```

- [ ] **Step 5: Write common types test**

```typescript
// src/types/common.test.ts
import { describe, it, expect } from "vitest";
import { ok, err, localize } from "./common";

describe("Result", () => {
  it("ok wraps data", () => {
    const result = ok(42);
    expect(result).toEqual({ ok: true, data: 42 });
  });

  it("err wraps error", () => {
    const result = err("NOT_FOUND", "missing");
    expect(result).toEqual({ ok: false, error: { code: "NOT_FOUND", message: "missing" } });
  });
});

describe("localize", () => {
  const text = { en: "Hello", ja: "こんにちは", zh: "你好" };

  it("returns matching language", () => {
    expect(localize(text, "ja")).toBe("こんにちは");
  });

  it("falls back to English", () => {
    expect(localize(text, "ko")).toBe("Hello");
  });

  it("falls back to first value if no English", () => {
    expect(localize({ ja: "テスト" }, "ko")).toBe("テスト");
  });

  it("returns empty string for empty object", () => {
    expect(localize({}, "en")).toBe("");
  });
});
```

- [ ] **Step 6: Create AI types**

```typescript
// src/types/ai.ts
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMResponse {
  content: string;
  tokensUsed: { input: number; output: number };
  model: string;
  provider: string;
}

export interface ResolvedLocation {
  spotId: string;
  spotName: string;
  confidence: number;
  source: "alias" | "embedding" | "gpt";
}

export type Intent =
  | "tourism"
  | "transit"
  | "booking"
  | "general_info"
  | "greeting"
  | "off_topic";

export interface ClassificationResult {
  intent: Intent;
  confidence: number;
  extractedEntities?: {
    location?: string;
    category?: string;
    date?: string;
  };
}
```

- [ ] **Step 7: Run all tests**

```bash
npx vitest run
```

Expected: All tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/lib/env.ts src/lib/env.test.ts src/types/common.ts src/types/common.test.ts src/types/ai.ts
git commit -m "feat: add environment validation and common types (Result, LocalizedText, AI types)"
```

---

### Task 3: Database Schema + Migrations

**Files:**
- Create: `src/lib/db/client.ts`, `src/lib/db/schema.ts`, `drizzle.config.ts`
- Test: `src/lib/db/schema.test.ts`

**Interfaces:**
- Consumes: `getEnv()` from Task 2
- Produces:
  - Drizzle schema exports: `users`, `chatSessions`, `chatMessages`, `flows`, `flowSteps`, `flowOptions`, `categories`, `tourismSpots`, `spotCategories`, `locationAliases`, `events`, `advertisers`, `adCampaigns`, `adImpressions`, `coupons`, `couponRedemptions`, `adminUsers`, `adminAuditLogs`
  - `db` — Drizzle client instance
  - Generated migration files in `drizzle/`

- [ ] **Step 1: Write schema type test**

```typescript
// src/lib/db/schema.test.ts
import { describe, it, expect } from "vitest";
import * as schema from "./schema";

describe("schema", () => {
  it("exports all 17 tables", () => {
    const tableNames = [
      "users", "chatSessions", "chatMessages",
      "flows", "flowSteps", "flowOptions",
      "categories", "tourismSpots", "spotCategories", "locationAliases",
      "events",
      "advertisers", "adCampaigns", "adImpressions", "coupons", "couponRedemptions",
      "adminUsers", "adminAuditLogs",
    ];
    for (const name of tableNames) {
      expect(schema).toHaveProperty(name);
    }
  });

  it("users table has platform and platform_uid columns", () => {
    const cols = Object.keys(schema.users);
    expect(cols).toContain("platform");
    expect(cols).toContain("platformUid");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/lib/db/schema.test.ts
```

Expected: FAIL (module not found)

- [ ] **Step 3: Create Drizzle config**

```typescript
// drizzle.config.ts
import type { Config } from "drizzle-kit";

export default {
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
```

- [ ] **Step 4: Create DB client**

```typescript
// src/lib/db/client.ts
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

export function createDb(databaseUrl: string) {
  const sql = neon(databaseUrl);
  return drizzle(sql, { schema });
}

export type Database = ReturnType<typeof createDb>;
```

- [ ] **Step 5: Create full Drizzle schema**

```typescript
// src/lib/db/schema.ts
import {
  pgTable, uuid, varchar, text, boolean, integer,
  timestamp, decimal, jsonb, uniqueIndex, index,
} from "drizzle-orm/pg-core";

// ── Users & Sessions ──

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  platform: varchar("platform", { length: 20 }).notNull(),
  platformUid: varchar("platform_uid", { length: 255 }).notNull(),
  language: varchar("language", { length: 10 }),
  firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
  lastActiveAt: timestamp("last_active_at", { withTimezone: true }).notNull().defaultNow(),
  metadata: jsonb("metadata").default({}),
}, (t) => [
  uniqueIndex("uq_users_platform_uid").on(t.platform, t.platformUid),
]);

export const chatSessions = pgTable("chat_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  mode: varchar("mode", { length: 20 }).notNull().default("menu"),
  activeFlowId: uuid("active_flow_id").references(() => flows.id),
  currentStepId: uuid("current_step_id").references(() => flowSteps.id),
  flowContext: jsonb("flow_context").default({}),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  isActive: boolean("is_active").notNull().default(true),
});

export const chatMessages = pgTable("chat_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id").notNull().references(() => chatSessions.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  direction: varchar("direction", { length: 10 }).notNull(),
  contentType: varchar("content_type", { length: 20 }).notNull(),
  content: text("content").notNull(),
  metadata: jsonb("metadata").default({}),
  tokensUsed: integer("tokens_used").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_messages_session").on(t.sessionId, t.createdAt),
  index("idx_messages_user").on(t.userId, t.createdAt),
]);

// ── Flows (CMS-Managed) ──

export const flows = pgTable("flows", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  icon: varchar("icon", { length: 10 }),
  displayNames: jsonb("display_names").notNull().default({}),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const flowSteps = pgTable("flow_steps", {
  id: uuid("id").primaryKey().defaultRandom(),
  flowId: uuid("flow_id").notNull().references(() => flows.id, { onDelete: "cascade" }),
  stepOrder: integer("step_order").notNull(),
  type: varchar("type", { length: 20 }).notNull(),
  messages: jsonb("messages").notNull().default({}),
  apiAction: varchar("api_action", { length: 100 }),
  config: jsonb("config").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("uq_flow_steps_order").on(t.flowId, t.stepOrder),
]);

export const flowOptions = pgTable("flow_options", {
  id: uuid("id").primaryKey().defaultRandom(),
  stepId: uuid("step_id").notNull().references(() => flowSteps.id, { onDelete: "cascade" }),
  labels: jsonb("labels").notNull().default({}),
  value: varchar("value", { length: 255 }).notNull(),
  nextStepId: uuid("next_step_id").references(() => flowSteps.id),
  sortOrder: integer("sort_order").notNull().default(0),
});

// ── Tourism Content ──

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: varchar("slug", { length: 50 }).notNull().unique(),
  names: jsonb("names").notNull().default({}),
  icon: varchar("icon", { length: 10 }),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const tourismSpots = pgTable("tourism_spots", {
  id: uuid("id").primaryKey().defaultRandom(),
  googlePlaceId: varchar("google_place_id", { length: 255 }),
  nameKo: varchar("name_ko", { length: 255 }).notNull(),
  names: jsonb("names").notNull().default({}),
  description: jsonb("description").notNull().default({}),
  addressKo: text("address_ko"),
  addresses: jsonb("addresses").default({}),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  phone: varchar("phone", { length: 50 }),
  website: varchar("website", { length: 500 }),
  images: jsonb("images").default([]),
  rating: decimal("rating", { precision: 2, scale: 1 }),
  priceLevel: integer("price_level"),
  openingHours: jsonb("opening_hours").default({}),
  tags: jsonb("tags").default([]),
  source: varchar("source", { length: 20 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
// Note: embedding VECTOR(1536) column added via raw SQL migration (Drizzle doesn't natively support pgvector)

export const spotCategories = pgTable("spot_categories", {
  spotId: uuid("spot_id").notNull().references(() => tourismSpots.id, { onDelete: "cascade" }),
  categoryId: uuid("category_id").notNull().references(() => categories.id, { onDelete: "cascade" }),
}, (t) => [
  // composite primary key handled by drizzle via primaryKey()
]);

export const locationAliases = pgTable("location_aliases", {
  id: uuid("id").primaryKey().defaultRandom(),
  spotId: uuid("spot_id").references(() => tourismSpots.id, { onDelete: "cascade" }),
  alias: varchar("alias", { length: 255 }).notNull(),
  language: varchar("language", { length: 10 }).notNull(),
  source: varchar("source", { length: 20 }).notNull(),
}, (t) => [
  uniqueIndex("uq_alias_language").on(t.alias, t.language),
  index("idx_aliases_search").on(t.language, t.alias),
]);

// ── Events ──

export const events = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  nameKo: varchar("name_ko", { length: 255 }).notNull(),
  names: jsonb("names").notNull().default({}),
  description: jsonb("description").notNull().default({}),
  category: varchar("category", { length: 50 }).notNull(),
  venueName: jsonb("venue_name").default({}),
  addressKo: text("address_ko"),
  addresses: jsonb("addresses").default({}),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  recurrence: varchar("recurrence", { length: 20 }),
  priceInfo: jsonb("price_info").default({}),
  bookingUrl: varchar("booking_url", { length: 500 }),
  images: jsonb("images").default([]),
  source: varchar("source", { length: 20 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Ads & Revenue ──

export const advertisers = pgTable("advertisers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  contactEmail: varchar("contact_email", { length: 255 }),
  contactPhone: varchar("contact_phone", { length: 50 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const adCampaigns = pgTable("ad_campaigns", {
  id: uuid("id").primaryKey().defaultRandom(),
  advertiserId: uuid("advertiser_id").notNull().references(() => advertisers.id),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 20 }).notNull(),
  content: jsonb("content").notNull().default({}),
  targetCategories: jsonb("target_categories").default([]),
  targetLanguages: jsonb("target_languages").default([]),
  budgetTotal: decimal("budget_total", { precision: 12, scale: 2 }),
  budgetSpent: decimal("budget_spent", { precision: 12, scale: 2 }).default("0"),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const adImpressions = pgTable("ad_impressions", {
  id: uuid("id").primaryKey().defaultRandom(),
  campaignId: uuid("campaign_id").notNull().references(() => adCampaigns.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  sessionId: uuid("session_id").references(() => chatSessions.id),
  eventType: varchar("event_type", { length: 20 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_impressions_campaign").on(t.campaignId, t.createdAt),
]);

export const coupons = pgTable("coupons", {
  id: uuid("id").primaryKey().defaultRandom(),
  campaignId: uuid("campaign_id").notNull().references(() => adCampaigns.id),
  code: varchar("code", { length: 50 }).notNull().unique(),
  description: jsonb("description").notNull().default({}),
  discountType: varchar("discount_type", { length: 20 }).notNull(),
  discountValue: decimal("discount_value", { precision: 10, scale: 2 }).notNull(),
  maxUses: integer("max_uses"),
  usedCount: integer("used_count").notNull().default(0),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
});

export const couponRedemptions = pgTable("coupon_redemptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  couponId: uuid("coupon_id").notNull().references(() => coupons.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  redeemedAt: timestamp("redeemed_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Admin ──

export const adminUsers = pgTable("admin_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  role: varchar("role", { length: 20 }).notNull().default("editor"),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const adminAuditLogs = pgTable("admin_audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  adminId: uuid("admin_id").notNull().references(() => adminUsers.id),
  action: varchar("action", { length: 50 }).notNull(),
  targetTable: varchar("target_table", { length: 50 }),
  targetId: uuid("target_id"),
  changes: jsonb("changes").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_audit_admin").on(t.adminId, t.createdAt),
]);
```

- [ ] **Step 6: Run schema test**

```bash
npx vitest run src/lib/db/schema.test.ts
```

Expected: All tests pass.

- [ ] **Step 7: Generate migration**

```bash
npx drizzle-kit generate
```

Expected: Migration SQL files created in `drizzle/` directory.

- [ ] **Step 8: Create pgvector migration manually**

Create `drizzle/0001_add_pgvector.sql`:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
ALTER TABLE tourism_spots ADD COLUMN IF NOT EXISTS embedding vector(1536);
CREATE INDEX IF NOT EXISTS idx_spots_embedding ON tourism_spots
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

- [ ] **Step 9: Commit**

```bash
git add src/lib/db/ drizzle/ drizzle.config.ts
git commit -m "feat: add complete Drizzle schema (17 tables) with pgvector migration"
```

---

### Task 4: LLM Provider Abstraction + Groq/Together Implementations

**Files:**
- Create: `src/services/ai/llm-provider.ts`, `src/services/ai/providers/groq.provider.ts`, `src/services/ai/providers/together.provider.ts`, `src/services/ai/llm-router.ts`
- Test: `src/services/ai/llm-router.test.ts`

**Interfaces:**
- Consumes: `getEnv()` from Task 2, `ChatMessage`, `LLMResponse` from `src/types/ai.ts`
- Produces:
  - `LLMProvider` interface: `chat(params): Promise<LLMResponse>`
  - `GroqProvider` class implementing `LLMProvider`
  - `TogetherProvider` class implementing `LLMProvider`
  - `LLMRouter` class: `lightweight(messages): Promise<LLMResponse>`, `conversation(messages): Promise<LLMResponse>`

- [ ] **Step 1: Write LLM router test (with mocked providers)**

```typescript
// src/services/ai/llm-router.test.ts
import { describe, it, expect, vi } from "vitest";
import { LLMRouter } from "./llm-router";
import type { LLMProvider } from "./llm-provider";
import type { LLMResponse } from "@/types/ai";

function createMockProvider(name: string, shouldFail = false): LLMProvider {
  return {
    chat: vi.fn().mockImplementation(async () => {
      if (shouldFail) throw new Error(`${name} failed`);
      return {
        content: `response from ${name}`,
        tokensUsed: { input: 10, output: 20 },
        model: "test-model",
        provider: name,
      } satisfies LLMResponse;
    }),
  };
}

describe("LLMRouter", () => {
  it("lightweight uses primary provider", async () => {
    const primary = createMockProvider("groq");
    const fallback = createMockProvider("together");
    const router = new LLMRouter(primary, fallback, {
      lightModel: "llama-3.1-8b-instant",
      chatModel: "llama-3.3-70b-versatile",
    });

    const result = await router.lightweight([{ role: "user", content: "test" }]);
    expect(result.provider).toBe("groq");
    expect(primary.chat).toHaveBeenCalledOnce();
    expect(fallback.chat).not.toHaveBeenCalled();
  });

  it("conversation uses primary provider", async () => {
    const primary = createMockProvider("groq");
    const fallback = createMockProvider("together");
    const router = new LLMRouter(primary, fallback, {
      lightModel: "llama-3.1-8b-instant",
      chatModel: "llama-3.3-70b-versatile",
    });

    const result = await router.conversation([{ role: "user", content: "hello" }]);
    expect(result.provider).toBe("groq");
  });

  it("falls back when primary fails", async () => {
    const primary = createMockProvider("groq", true);
    const fallback = createMockProvider("together");
    const router = new LLMRouter(primary, fallback, {
      lightModel: "llama-3.1-8b-instant",
      chatModel: "llama-3.3-70b-versatile",
    });

    const result = await router.lightweight([{ role: "user", content: "test" }]);
    expect(result.provider).toBe("together");
  });

  it("throws when both providers fail", async () => {
    const primary = createMockProvider("groq", true);
    const fallback = createMockProvider("together", true);
    const router = new LLMRouter(primary, fallback, {
      lightModel: "llama-3.1-8b-instant",
      chatModel: "llama-3.3-70b-versatile",
    });

    await expect(
      router.lightweight([{ role: "user", content: "test" }])
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/services/ai/llm-router.test.ts
```

Expected: FAIL (modules not found)

- [ ] **Step 3: Implement LLMProvider interface**

```typescript
// src/services/ai/llm-provider.ts
import type { ChatMessage, LLMResponse } from "@/types/ai";

export interface LLMChatParams {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  responseFormat?: "text" | "json";
}

export interface LLMProvider {
  chat(params: LLMChatParams): Promise<LLMResponse>;
}
```

- [ ] **Step 4: Implement GroqProvider**

```typescript
// src/services/ai/providers/groq.provider.ts
import Groq from "groq-sdk";
import type { LLMProvider, LLMChatParams } from "../llm-provider";
import type { LLMResponse } from "@/types/ai";

export class GroqProvider implements LLMProvider {
  private client: Groq;

  constructor(apiKey: string) {
    this.client = new Groq({ apiKey });
  }

  async chat(params: LLMChatParams): Promise<LLMResponse> {
    const response = await this.client.chat.completions.create({
      model: params.model,
      messages: params.messages,
      temperature: params.temperature ?? 0.7,
      max_tokens: params.maxTokens ?? 1024,
      response_format: params.responseFormat === "json"
        ? { type: "json_object" }
        : undefined,
    });

    const choice = response.choices[0];
    if (!choice?.message?.content) {
      throw new Error("Groq returned empty response");
    }

    return {
      content: choice.message.content,
      tokensUsed: {
        input: response.usage?.prompt_tokens ?? 0,
        output: response.usage?.completion_tokens ?? 0,
      },
      model: params.model,
      provider: "groq",
    };
  }
}
```

- [ ] **Step 5: Implement TogetherProvider**

```typescript
// src/services/ai/providers/together.provider.ts
import Together from "together-ai";
import type { LLMProvider, LLMChatParams } from "../llm-provider";
import type { LLMResponse } from "@/types/ai";

export class TogetherProvider implements LLMProvider {
  private client: Together;

  constructor(apiKey: string) {
    this.client = new Together({ apiKey });
  }

  async chat(params: LLMChatParams): Promise<LLMResponse> {
    const response = await this.client.chat.completions.create({
      model: params.model,
      messages: params.messages,
      temperature: params.temperature ?? 0.7,
      max_tokens: params.maxTokens ?? 1024,
      response_format: params.responseFormat === "json"
        ? { type: "json_object" }
        : undefined,
    });

    const choice = response.choices[0];
    if (!choice?.message?.content) {
      throw new Error("Together returned empty response");
    }

    return {
      content: choice.message.content,
      tokensUsed: {
        input: response.usage?.prompt_tokens ?? 0,
        output: response.usage?.completion_tokens ?? 0,
      },
      model: params.model,
      provider: "together",
    };
  }
}
```

- [ ] **Step 6: Implement LLMRouter**

```typescript
// src/services/ai/llm-router.ts
import type { LLMProvider } from "./llm-provider";
import type { ChatMessage, LLMResponse } from "@/types/ai";

interface LLMRouterConfig {
  lightModel: string;
  chatModel: string;
}

export class LLMRouter {
  constructor(
    private primary: LLMProvider,
    private fallback: LLMProvider,
    private config: LLMRouterConfig,
  ) {}

  async lightweight(messages: ChatMessage[]): Promise<LLMResponse> {
    return this.withFallback({
      model: this.config.lightModel,
      messages,
      temperature: 0.1,
      maxTokens: 512,
    });
  }

  async conversation(messages: ChatMessage[]): Promise<LLMResponse> {
    return this.withFallback({
      model: this.config.chatModel,
      messages,
      temperature: 0.7,
      maxTokens: 1024,
    });
  }

  async lightweightJson(messages: ChatMessage[]): Promise<LLMResponse> {
    return this.withFallback({
      model: this.config.lightModel,
      messages,
      temperature: 0.1,
      maxTokens: 512,
      responseFormat: "json",
    });
  }

  private async withFallback(
    params: Parameters<LLMProvider["chat"]>[0]
  ): Promise<LLMResponse> {
    try {
      return await this.primary.chat(params);
    } catch (primaryError) {
      console.warn("Primary LLM failed, falling back:", primaryError);
      try {
        return await this.fallback.chat(params);
      } catch (fallbackError) {
        throw new Error(
          `Both LLM providers failed. Primary: ${primaryError}. Fallback: ${fallbackError}`
        );
      }
    }
  }
}
```

- [ ] **Step 7: Install SDK dependencies**

```bash
npm install groq-sdk together-ai
```

- [ ] **Step 8: Run tests**

```bash
npx vitest run src/services/ai/llm-router.test.ts
```

Expected: All 4 tests pass.

- [ ] **Step 9: Commit**

```bash
git add src/services/ai/ package.json package-lock.json
git commit -m "feat: add LLM provider abstraction with Groq, Together AI, and fallback router"
```

---

### Task 5: Language Detection Service

**Files:**
- Create: `src/services/ai/language.service.ts`
- Test: `src/services/ai/language.service.test.ts`

**Interfaces:**
- Consumes: `franc-min` library
- Produces:
  - `LanguageService` class: `detect(text: string): { language: string; confidence: number }`, `resolveLanguage(text: string, sessionLanguage?: string): string`

- [ ] **Step 1: Write language service test**

```typescript
// src/services/ai/language.service.test.ts
import { describe, it, expect } from "vitest";
import { LanguageService } from "./language.service";

describe("LanguageService", () => {
  const service = new LanguageService();

  it("detects English text", () => {
    const result = service.detect("Where is the best beach in Busan?");
    expect(result.language).toBe("en");
  });

  it("detects Japanese text", () => {
    const result = service.detect("釜山で一番おいしいレストランはどこですか？");
    expect(result.language).toBe("ja");
  });

  it("detects Chinese text", () => {
    const result = service.detect("釜山最好的海滩在哪里？");
    expect(result.language).toBe("zh");
  });

  it("returns fallback for very short text", () => {
    const result = service.resolveLanguage("hi", "ja");
    expect(result).toBe("ja"); // too short to detect, use session language
  });

  it("returns 'en' when no session language and detection fails", () => {
    const result = service.resolveLanguage("👋");
    expect(result).toBe("en");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/services/ai/language.service.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement LanguageService**

```typescript
// src/services/ai/language.service.ts
import { francAll } from "franc-min";

interface LanguageDetection {
  language: string;
  confidence: number;
}

const ISO_639_3_TO_1: Record<string, string> = {
  eng: "en", jpn: "ja", cmn: "zh", zho: "zh",
  kor: "ko", vie: "vi", tha: "th", ind: "id",
  msa: "ms", fra: "fr", deu: "de", spa: "es",
  por: "pt", rus: "ru", ara: "ar", hin: "hi",
};

const DEFAULT_LANGUAGE = "en";
const MIN_TEXT_LENGTH = 10;
const MIN_CONFIDENCE = 0.5;

export class LanguageService {
  detect(text: string): LanguageDetection {
    if (text.length < MIN_TEXT_LENGTH) {
      return { language: DEFAULT_LANGUAGE, confidence: 0 };
    }

    const results = francAll(text, { minLength: 3 });
    if (results.length === 0 || results[0] === undefined) {
      return { language: DEFAULT_LANGUAGE, confidence: 0 };
    }

    const [iso3, score] = results[0];
    const language = ISO_639_3_TO_1[iso3] ?? DEFAULT_LANGUAGE;
    return { language, confidence: score };
  }

  resolveLanguage(text: string, sessionLanguage?: string): string {
    const detection = this.detect(text);

    if (detection.confidence >= MIN_CONFIDENCE) {
      return detection.language;
    }

    if (sessionLanguage) {
      return sessionLanguage;
    }

    return DEFAULT_LANGUAGE;
  }
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run src/services/ai/language.service.test.ts
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/services/ai/language.service.ts src/services/ai/language.service.test.ts
git commit -m "feat: add language detection service using franc-min"
```

---

### Task 6: Intent Classifier

**Files:**
- Create: `src/services/ai/intent-classifier.ts`
- Test: `src/services/ai/intent-classifier.test.ts`

**Interfaces:**
- Consumes: `LLMRouter.lightweightJson()` from Task 4, `ClassificationResult`, `Intent` from `src/types/ai.ts`
- Produces:
  - `IntentClassifier` class: `classify(message: string, language: string, history?: ChatMessage[]): Promise<ClassificationResult>`

- [ ] **Step 1: Write intent classifier test (mocked LLM)**

```typescript
// src/services/ai/intent-classifier.test.ts
import { describe, it, expect, vi } from "vitest";
import { IntentClassifier } from "./intent-classifier";
import type { LLMRouter } from "./llm-router";
import type { LLMResponse } from "@/types/ai";

function createMockRouter(responseContent: string): LLMRouter {
  return {
    lightweightJson: vi.fn().mockResolvedValue({
      content: responseContent,
      tokensUsed: { input: 10, output: 20 },
      model: "test",
      provider: "test",
    } satisfies LLMResponse),
  } as unknown as LLMRouter;
}

describe("IntentClassifier", () => {
  it("classifies tourism intent", async () => {
    const router = createMockRouter(JSON.stringify({
      intent: "tourism",
      confidence: 0.95,
      entities: { location: "Haeundae" },
    }));
    const classifier = new IntentClassifier(router);

    const result = await classifier.classify("Best restaurant near Haeundae?", "en");
    expect(result.intent).toBe("tourism");
    expect(result.extractedEntities?.location).toBe("Haeundae");
  });

  it("classifies off_topic intent", async () => {
    const router = createMockRouter(JSON.stringify({
      intent: "off_topic",
      confidence: 0.9,
      entities: {},
    }));
    const classifier = new IntentClassifier(router);

    const result = await classifier.classify("What is the meaning of life?", "en");
    expect(result.intent).toBe("off_topic");
  });

  it("defaults to off_topic on malformed JSON", async () => {
    const router = createMockRouter("not json");
    const classifier = new IntentClassifier(router);

    const result = await classifier.classify("test", "en");
    expect(result.intent).toBe("off_topic");
    expect(result.confidence).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/services/ai/intent-classifier.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement IntentClassifier**

```typescript
// src/services/ai/intent-classifier.ts
import type { LLMRouter } from "./llm-router";
import type { ChatMessage, ClassificationResult, Intent } from "@/types/ai";

const VALID_INTENTS: Intent[] = [
  "tourism", "transit", "booking", "general_info", "greeting", "off_topic",
];

const SYSTEM_PROMPT = `You are a Busan tourism intent classifier.
Classify the user's message into one of these intents:
- tourism: questions about tourist spots, restaurants, cafes, attractions
- transit: questions about transportation, directions, routes
- booking: questions about reservations, tickets, activities
- general_info: general Busan travel info (weather, currency, tips)
- greeting: greetings, thanks, goodbyes
- off_topic: anything unrelated to Busan tourism/travel

Extract entities if present: location, category, date.

Respond with JSON only:
{"intent": "...", "confidence": 0.0-1.0, "entities": {"location": "...", "category": "...", "date": "..."}}`;

export class IntentClassifier {
  constructor(private router: LLMRouter) {}

  async classify(
    message: string,
    language: string,
    history?: ChatMessage[],
  ): Promise<ClassificationResult> {
    const messages: ChatMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
    ];

    if (history && history.length > 0) {
      const recent = history.slice(-2);
      messages.push({
        role: "user",
        content: `Previous context: ${recent.map((m) => m.content).join(" | ")}`,
      });
    }

    messages.push({
      role: "user",
      content: `Language: ${language}\nMessage: ${message}`,
    });

    try {
      const response = await this.router.lightweightJson(messages);
      const parsed = JSON.parse(response.content);

      const intent: Intent = VALID_INTENTS.includes(parsed.intent)
        ? parsed.intent
        : "off_topic";

      return {
        intent,
        confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
        extractedEntities: parsed.entities
          ? {
              location: parsed.entities.location || undefined,
              category: parsed.entities.category || undefined,
              date: parsed.entities.date || undefined,
            }
          : undefined,
      };
    } catch {
      return { intent: "off_topic", confidence: 0 };
    }
  }
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run src/services/ai/intent-classifier.test.ts
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/services/ai/intent-classifier.ts src/services/ai/intent-classifier.test.ts
git commit -m "feat: add intent classifier with off_topic guard for free chat mode"
```

---

### Task 7: Location Resolver (3-Stage)

**Files:**
- Create: `src/services/ai/location-resolver.ts`
- Test: `src/services/ai/location-resolver.test.ts`

**Interfaces:**
- Consumes:
  - `LLMRouter.lightweightJson()` from Task 4
  - `locationAliases`, `tourismSpots` tables from Task 3 schema
  - `Database` type from Task 3
- Produces:
  - `LocationResolver` class: `resolve(query: string, language: string, context?: { category?: string }): Promise<ResolvedLocation | null>`

- [ ] **Step 1: Write location resolver test (mocked DB + LLM)**

```typescript
// src/services/ai/location-resolver.test.ts
import { describe, it, expect, vi } from "vitest";
import { LocationResolver } from "./location-resolver";
import type { LLMRouter } from "./llm-router";
import type { Database } from "@/lib/db/client";
import type { LLMResponse } from "@/types/ai";

function createMockRouter(responseContent: string): LLMRouter {
  return {
    lightweightJson: vi.fn().mockResolvedValue({
      content: responseContent,
      tokensUsed: { input: 10, output: 20 },
      model: "test",
      provider: "test",
    } satisfies LLMResponse),
  } as unknown as LLMRouter;
}

function createMockDb(aliasResult: unknown[] = [], spotResults: unknown[] = []): Database {
  return {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(spotResults),
          }),
          limit: vi.fn().mockResolvedValue(aliasResult),
        }),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
      }),
    }),
  } as unknown as Database;
}

describe("LocationResolver", () => {
  it("Stage 1: returns result from alias DB match", async () => {
    const mockDb = createMockDb([
      { spotId: "spot-1", spotName: "자갈치시장", alias: "fish market" },
    ]);
    const router = createMockRouter("{}");
    const resolver = new LocationResolver(mockDb, router);

    const result = await resolver.resolve("fish market", "en");
    expect(result).not.toBeNull();
    expect(result!.source).toBe("alias");
    expect(result!.spotId).toBe("spot-1");
    // LLM should NOT have been called
    expect(router.lightweightJson).not.toHaveBeenCalled();
  });

  it("Stage 3: falls back to LLM when alias not found", async () => {
    const mockDb = createMockDb([], [
      { id: "spot-1", nameKo: "자갈치시장", names: { en: "Jagalchi Fish Market" } },
      { id: "spot-2", nameKo: "부산공동어시장", names: { en: "Busan Cooperative Fish Market" } },
    ]);
    const router = createMockRouter(JSON.stringify({
      spotId: "spot-1",
      confidence: 0.9,
      reasoning: "Jagalchi is the famous fish market",
    }));
    const resolver = new LocationResolver(mockDb, router);

    const result = await resolver.resolve("the big fish market", "en");
    expect(result).not.toBeNull();
    expect(result!.source).toBe("gpt");
    expect(result!.spotId).toBe("spot-1");
  });

  it("returns null when LLM cannot resolve", async () => {
    const mockDb = createMockDb([], []);
    const router = createMockRouter(JSON.stringify({
      spotId: null,
      confidence: 0.1,
    }));
    const resolver = new LocationResolver(mockDb, router);

    const result = await resolver.resolve("xyznonexistent", "en");
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/services/ai/location-resolver.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement LocationResolver**

```typescript
// src/services/ai/location-resolver.ts
import { eq, and, ilike } from "drizzle-orm";
import type { Database } from "@/lib/db/client";
import type { LLMRouter } from "./llm-router";
import type { ChatMessage, ResolvedLocation } from "@/types/ai";
import { locationAliases, tourismSpots } from "@/lib/db/schema";

const MIN_CONFIDENCE = 0.5;

export class LocationResolver {
  constructor(
    private db: Database,
    private router: LLMRouter,
  ) {}

  async resolve(
    query: string,
    language: string,
    context?: { category?: string },
  ): Promise<ResolvedLocation | null> {
    // Stage 1: DB alias search
    const aliasResult = await this.searchByAlias(query, language);
    if (aliasResult) return aliasResult;

    // Stage 2: Embedding search (TODO[MVP]: implement in SP3 when embedding pipeline is ready)
    // For now, skip to Stage 3

    // Stage 3: LLM inference
    const llmResult = await this.resolveWithLLM(query, language, context);
    if (llmResult) {
      // Self-learning: cache successful resolution as alias
      await this.cacheAsAlias(query, language, llmResult.spotId);
    }
    return llmResult;
  }

  private async searchByAlias(
    query: string,
    language: string,
  ): Promise<ResolvedLocation | null> {
    try {
      const results = await this.db
        .select({
          spotId: locationAliases.spotId,
          alias: locationAliases.alias,
          spotName: tourismSpots.nameKo,
        })
        .from(locationAliases)
        .innerJoin(tourismSpots, eq(locationAliases.spotId, tourismSpots.id))
        .where(
          and(
            ilike(locationAliases.alias, query),
            eq(locationAliases.language, language),
          ),
        )
        .limit(1);

      if (results.length === 0 || !results[0]) return null;

      return {
        spotId: results[0].spotId!,
        spotName: results[0].spotName,
        confidence: 1.0,
        source: "alias",
      };
    } catch {
      return null;
    }
  }

  private async resolveWithLLM(
    query: string,
    language: string,
    context?: { category?: string },
  ): Promise<ResolvedLocation | null> {
    // Fetch candidate spots from DB
    let candidates: { id: string; nameKo: string; names: unknown }[];
    try {
      candidates = await this.db
        .select({
          id: tourismSpots.id,
          nameKo: tourismSpots.nameKo,
          names: tourismSpots.names,
        })
        .from(tourismSpots)
        .where(eq(tourismSpots.isActive, true))
        .limit(50);
    } catch {
      return null;
    }

    if (candidates.length === 0) return null;

    const candidateList = candidates
      .map((c, i) => `${i + 1}. ${c.nameKo} (${JSON.stringify(c.names)})`)
      .join("\n");

    const messages: ChatMessage[] = [
      {
        role: "system",
        content: `You are a Busan location resolver. Match the user's query to one of the candidate locations.
Respond with JSON: {"spotId": "uuid-or-null", "confidence": 0.0-1.0, "reasoning": "..."}
If no match, set spotId to null.`,
      },
      {
        role: "user",
        content: `Query: "${query}" (Language: ${language})
${context?.category ? `Category hint: ${context.category}` : ""}

Candidates:
${candidateList}

Match the query to the best candidate. Use the candidate's array index to identify it.`,
      },
    ];

    try {
      const response = await this.router.lightweightJson(messages);
      const parsed = JSON.parse(response.content);

      if (!parsed.spotId || parsed.confidence < MIN_CONFIDENCE) return null;

      // Find the matching candidate
      const matchIndex = parseInt(parsed.spotId, 10) - 1;
      const match = candidates[matchIndex];
      if (!match) {
        // Try direct UUID match
        const directMatch = candidates.find((c) => c.id === parsed.spotId);
        if (!directMatch) return null;
        return {
          spotId: directMatch.id,
          spotName: directMatch.nameKo,
          confidence: parsed.confidence,
          source: "gpt",
        };
      }

      return {
        spotId: match.id,
        spotName: match.nameKo,
        confidence: parsed.confidence,
        source: "gpt",
      };
    } catch {
      return null;
    }
  }

  private async cacheAsAlias(
    query: string,
    language: string,
    spotId: string,
  ): Promise<void> {
    try {
      await this.db
        .insert(locationAliases)
        .values({
          spotId,
          alias: query.toLowerCase(),
          language,
          source: "ai_generated",
        })
        .onConflictDoNothing();
    } catch {
      // Non-critical: silently fail if caching fails
    }
  }
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run src/services/ai/location-resolver.test.ts
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/services/ai/location-resolver.ts src/services/ai/location-resolver.test.ts
git commit -m "feat: add 3-stage location resolver with alias DB search, LLM fallback, and self-learning cache"
```

---

### Task 8: Seed Data + Integration Verification

**Files:**
- Create: `src/lib/db/seed.ts`
- Modify: `package.json` (add seed script)

**Interfaces:**
- Consumes: All schema tables from Task 3, `Database` from Task 3
- Produces: Seed script that populates DB with sample Busan tourism data for development/testing

- [ ] **Step 1: Create seed script**

```typescript
// src/lib/db/seed.ts
import { createDb } from "./client";
import { categories, tourismSpots, locationAliases, flows, flowSteps, flowOptions } from "./schema";
import "dotenv/config";

async function seed() {
  const db = createDb(process.env.DATABASE_URL!);

  console.log("Seeding categories...");
  await db.insert(categories).values([
    { slug: "beach", names: { en: "Beach", ja: "ビーチ", zh: "海滩", ko: "해변" }, icon: "🏖", sortOrder: 1 },
    { slug: "restaurant", names: { en: "Restaurant", ja: "レストラン", zh: "餐厅", ko: "맛집" }, icon: "🍽", sortOrder: 2 },
    { slug: "market", names: { en: "Market", ja: "市場", zh: "市场", ko: "시장" }, icon: "🏪", sortOrder: 3 },
    { slug: "temple", names: { en: "Temple", ja: "寺院", zh: "寺庙", ko: "사찰" }, icon: "🏛", sortOrder: 4 },
    { slug: "cafe", names: { en: "Cafe", ja: "カフェ", zh: "咖啡厅", ko: "카페" }, icon: "☕", sortOrder: 5 },
  ]).onConflictDoNothing();

  console.log("Seeding tourism spots...");
  const spots = await db.insert(tourismSpots).values([
    {
      nameKo: "해운대 해수욕장",
      names: { en: "Haeundae Beach", ja: "海雲台ビーチ", zh: "海云台海水浴场" },
      description: { en: "Korea's most famous beach", ja: "韓国で最も有名なビーチ", zh: "韩国最著名的海滩" },
      addressKo: "부산 해운대구 우동",
      latitude: "35.1587",
      longitude: "129.1604",
      rating: "4.7",
      source: "curated",
    },
    {
      nameKo: "자갈치시장",
      names: { en: "Jagalchi Fish Market", ja: "チャガルチ市場", zh: "扎嘎其市场" },
      description: { en: "Korea's largest seafood market", ja: "韓国最大の水産市場", zh: "韩国最大的海鲜市场" },
      addressKo: "부산 중구 남포동",
      latitude: "35.0968",
      longitude: "129.0305",
      rating: "4.5",
      source: "curated",
    },
    {
      nameKo: "감천문화마을",
      names: { en: "Gamcheon Culture Village", ja: "甘川文化村", zh: "甘川文化村" },
      description: { en: "Colorful hillside village with art installations", ja: "カラフルな丘の上の芸術村", zh: "色彩缤纷的山坡艺术村" },
      addressKo: "부산 사하구 감천동",
      latitude: "35.0975",
      longitude: "129.0106",
      rating: "4.6",
      source: "curated",
    },
  ]).returning();

  console.log("Seeding location aliases...");
  if (spots[0]) {
    await db.insert(locationAliases).values([
      { spotId: spots[0].id, alias: "haeundae beach", language: "en", source: "manual" },
      { spotId: spots[0].id, alias: "famous beach busan", language: "en", source: "manual" },
      { spotId: spots[0].id, alias: "海雲台", language: "ja", source: "manual" },
      { spotId: spots[0].id, alias: "海云台", language: "zh", source: "manual" },
    ]).onConflictDoNothing();
  }
  if (spots[1]) {
    await db.insert(locationAliases).values([
      { spotId: spots[1].id, alias: "fish market", language: "en", source: "manual" },
      { spotId: spots[1].id, alias: "big fish market", language: "en", source: "manual" },
      { spotId: spots[1].id, alias: "seafood market", language: "en", source: "manual" },
      { spotId: spots[1].id, alias: "チャガルチ", language: "ja", source: "manual" },
      { spotId: spots[1].id, alias: "鱼市场", language: "zh", source: "manual" },
    ]).onConflictDoNothing();
  }
  if (spots[2]) {
    await db.insert(locationAliases).values([
      { spotId: spots[2].id, alias: "colorful village", language: "en", source: "manual" },
      { spotId: spots[2].id, alias: "art village", language: "en", source: "manual" },
      { spotId: spots[2].id, alias: "甘川村", language: "zh", source: "manual" },
    ]).onConflictDoNothing();
  }

  console.log("Seeding sample flows...");
  const [transitFlow] = await db.insert(flows).values([
    { name: "transit", icon: "🗺", displayNames: { en: "Find Route", ja: "経路検索", zh: "查找路线", ko: "길찾기" }, sortOrder: 1 },
    { name: "tourism", icon: "🏖", displayNames: { en: "Tourist Spots", ja: "観光地", zh: "旅游景点", ko: "관광지/맛집" }, sortOrder: 2 },
    { name: "booking", icon: "🎫", displayNames: { en: "Book Activity", ja: "予約", zh: "预订", ko: "예약하기" }, sortOrder: 3 },
  ]).returning();

  if (transitFlow) {
    const steps = await db.insert(flowSteps).values([
      { flowId: transitFlow.id, stepOrder: 1, type: "text_input", messages: { en: "Where are you now?", ja: "今どこにいますか？", zh: "您现在在哪里？" } },
      { flowId: transitFlow.id, stepOrder: 2, type: "text_input", messages: { en: "Where would you like to go?", ja: "どこに行きたいですか？", zh: "您想去哪里？" } },
      { flowId: transitFlow.id, stepOrder: 3, type: "api_call", messages: {}, apiAction: "search_transit_route" },
      { flowId: transitFlow.id, stepOrder: 4, type: "result", messages: { en: "Here are your route options:", ja: "ルートオプション：", zh: "路线选项：" } },
    ]).returning();

    if (steps[1]) {
      await db.insert(flowOptions).values([
        { stepId: steps[1].id, labels: { en: "Haeundae Beach", ja: "海雲台ビーチ", zh: "海云台" }, value: "haeundae", sortOrder: 1 },
        { stepId: steps[1].id, labels: { en: "Gwangalli Beach", ja: "広安里ビーチ", zh: "广安里" }, value: "gwangalli", sortOrder: 2 },
        { stepId: steps[1].id, labels: { en: "Jagalchi Market", ja: "チャガルチ市場", zh: "扎嘎其市场" }, value: "jagalchi", sortOrder: 3 },
      ]).onConflictDoNothing();
    }
  }

  console.log("Seed complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
```

- [ ] **Step 2: Add seed script to package.json**

```json
{
  "scripts": {
    "db:seed": "npx tsx src/lib/db/seed.ts"
  }
}
```

- [ ] **Step 3: Run all tests to verify nothing is broken**

```bash
npx vitest run
```

Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/lib/db/seed.ts package.json
git commit -m "feat: add seed script with sample Busan tourism data (spots, aliases, flows)"
```

---

## Summary

| Task | Deliverable | Tests |
|------|-----------|-------|
| 1 | Project scaffolding, config, ARCHITECTURE.md | Build + test runner working |
| 2 | Env validation, Result/LocalizedText/AI types | 6 tests |
| 3 | Full Drizzle schema (17 tables) + migrations | 2 tests |
| 4 | LLMProvider interface, Groq/Together providers, LLMRouter with fallback | 4 tests |
| 5 | LanguageService (franc-min based detection) | 5 tests |
| 6 | IntentClassifier (off_topic guard) | 3 tests |
| 7 | LocationResolver (3-stage: alias → embedding → LLM, self-learning) | 3 tests |
| 8 | Seed script with sample Busan data | Integration verification |

SP1 완료 후 다음: **SP2 (Bot Integration)** + **SP3 (Tourism & Transit)** 병렬 진행 가능.
