# PiggyBack - Busan Foreign Tourist Integrated Platform Design Spec

> **Date**: 2026-08-04
> **Project**: PiggyBack (piggy_back)
> **Client**: 대흥기업 (실무 담당 최연주, 문서 수신자 정수현 대표)
> **Developer**: 인하우스 1인 풀스택
> **Status**: Design approved, pending implementation plan

---

## 1. Project Overview

### 1-1. What

부산 외국인 관광 통합 웹플랫폼 — 교통/길찾기/관광/예약을 외국인 관광객용 메신저 봇으로 통합 제공하는 서비스. 별도 앱 설치 없이 WhatsApp/LINE 봇을 통해 즉시 사용 가능.

### 1-2. Why

- 부산 인바운드 관광객(대만/중국/일본 약 49%, 영어권 등)이 언어 장벽 없이 관광 정보에 접근
- 한국어 지명을 음역하지 않아도, 자기 언어로 "대충 검색"하면 찾아주는 자연어 검색
- 공공사업(부산 홍보) + 챗 내 광고(스폰서 추천/쿠폰/네이티브 콘텐츠)를 통한 수익 모델

### 1-3. Channel Strategy

- **Phase 1**: WhatsApp + LINE (부산 인바운드 주요 시장 커버)
- **Phase 2**: WeChat (중국 사업자/법인 등록 요건으로 후순위)
- **공통 유입**: QR 코드 / 숏링크 (전 시장 공통)

### 1-4. Sub-Project Decomposition

프로젝트 규모가 크므로 5개 서브 프로젝트로 분리하여 진행.

| # | Sub-Project | Scope | Dependencies |
|---|-------------|-------|-------------|
| **SP1** | Core Foundation | 프로젝트 셋업, DB 스키마, AI 서비스, 다국어 지명 매핑 엔진 | 없음 |
| **SP2** | Bot Integration | WhatsApp/LINE 봇, QR/숏링크, 공통 메시지 핸들러 | SP1 |
| **SP3** | Tourism & Transit | 관광정보 API 연동, 교통 길찾기, 큐레이션 DB | SP1 |
| **SP4** | Booking & Ads | 예약 플랫폼 API 연동, 광고 시스템 | SP1, SP3 |
| **SP5** | Admin CMS | 풀 CMS (콘텐츠/광고/통계/대화로그 관리) | SP1, SP3, SP4 |

**진행 순서**: SP1 → SP2 + SP3 (병렬 가능) → SP4 → SP5

---

## 2. Architecture

### 2-1. Approach: Monolithic Next.js

1인 풀스택 개발에서 인프라 복잡도를 최소화하기 위해 단일 Next.js 프로젝트로 구성.

**장점**: 배포 단순(Vercel 하나), 코드 공유 쉬움, 1인 개발에 최적
**향후**: 규모 커지면 Turborepo 기반 monorepo로 마이그레이션 가능

### 2-2. Tech Stack

| Area | Technology | Reason |
|------|-----------|--------|
| Framework | Next.js 15 (App Router) | SSR + API Routes 통합, Vercel 최적화 |
| Language | TypeScript (strict) | 타입 안전성 |
| DB | Neon Serverless Postgres | Vercel 공식 통합, 서버리스 최적화 |
| ORM | Drizzle ORM | 타입 안전, 경량, 서버리스 친화적 |
| AI (lightweight) | Groq - Llama 3.1 8B (무료) | 의도 분류, 지명 매핑 |
| AI (conversation) | Groq - Llama 3.3 70B | 자유대화 응답 생성 |
| AI (fallback) | Together AI | Groq 장애 시 폴백 |
| Embedding | Hugging Face API (BGE-M3) | 다국어 임베딩, 무료 |
| Bot | WhatsApp Business API + LINE Messaging API | Phase 1 채널 |
| Auth (admin) | NextAuth.js v5 | Next.js 네이티브 인증 |
| Styling (CMS) | Tailwind CSS + shadcn/ui | 빠른 관리자 UI 구축 |
| Deployment | Vercel | Next.js 최적 배포 |

### 2-3. Project Structure

```
piggy_back/
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── (admin)/                # 관리자 CMS 라우트 그룹
│   │   │   ├── layout.tsx
│   │   │   ├── login/page.tsx
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── flows/
│   │   │   ├── spots/
│   │   │   ├── events/                # 행사/축제/공연 관리
│   │   │   ├── categories/
│   │   │   ├── ads/
│   │   │   ├── conversations/
│   │   │   ├── users/
│   │   │   ├── analytics/
│   │   │   └── settings/
│   │   ├── api/
│   │   │   ├── webhooks/
│   │   │   │   ├── whatsapp/route.ts
│   │   │   │   └── line/route.ts
│   │   │   ├── admin/              # 관리자 API
│   │   │   └── chat/               # (reserved)
│   │   ├── start/page.tsx          # QR/숏링크 랜딩 페이지
│   │   └── layout.tsx
│   ├── services/                   # 비즈니스 로직 계층
│   │   ├── ai/
│   │   │   ├── llm-provider.ts     # LLMProvider 인터페이스
│   │   │   ├── llm-router.ts       # 작업별 모델 라우팅
│   │   │   ├── providers/
│   │   │   │   ├── groq.provider.ts
│   │   │   │   ├── together.provider.ts
│   │   │   │   └── openai.provider.ts
│   │   │   ├── intent-classifier.ts
│   │   │   ├── chat.service.ts
│   │   │   ├── language.service.ts
│   │   │   ├── location-resolver.ts
│   │   │   ├── embedding.service.ts
│   │   │   └── ad.service.ts
│   │   ├── bot/
│   │   │   ├── types.ts            # 공통 메시지 타입
│   │   │   ├── adapter.ts          # BotAdapter 인터페이스
│   │   │   ├── whatsapp.adapter.ts
│   │   │   ├── line.adapter.ts
│   │   │   ├── adapter-registry.ts
│   │   │   ├── message-handler.ts
│   │   │   ├── menu.service.ts
│   │   │   └── flow/
│   │   │       ├── flow-engine.ts
│   │   │       ├── action-registry.ts
│   │   │       └── flow.repository.ts
│   │   ├── transit/
│   │   │   ├── transit.service.ts
│   │   │   ├── taxi.service.ts        # 택시 딥링크 생성
│   │   │   └── types.ts
│   │   ├── tourism/
│   │   │   ├── tourism.service.ts
│   │   │   ├── spot.repository.ts
│   │   │   ├── event.service.ts       # 행사/축제/공연
│   │   │   ├── event.repository.ts
│   │   │   └── types.ts
│   │   ├── booking/
│   │   │   ├── booking.service.ts
│   │   │   └── types.ts
│   │   └── ads/
│   │       ├── ads.service.ts
│   │       └── types.ts
│   ├── lib/                        # 공통 인프라
│   │   ├── db/
│   │   │   ├── schema.ts           # Drizzle 스키마 정의
│   │   │   ├── client.ts           # Neon DB 클라이언트
│   │   │   └── migrations/
│   │   ├── auth/
│   │   │   └── auth.config.ts      # NextAuth 설정
│   │   ├── external/
│   │   │   ├── api-client.ts       # 공통 HTTP 클라이언트
│   │   │   ├── transit/
│   │   │   │   ├── tago.client.ts
│   │   │   │   ├── busan-transit.client.ts
│   │   │   │   ├── google-maps.client.ts
│   │   │   │   ├── naver-maps.client.ts
│   │   │   │   └── types.ts
│   │   │   ├── tourism/
│   │   │   │   ├── tour-api.client.ts
│   │   │   │   ├── google-places.client.ts
│   │   │   │   └── types.ts
│   │   │   ├── booking/
│   │   │   │   ├── klook.client.ts
│   │   │   │   ├── kkday.client.ts
│   │   │   │   └── types.ts
│   │   │   └── types.ts
│   │   └── utils/
│   ├── components/admin/
│   │   ├── AdminSidebar.tsx
│   │   ├── AdminHeader.tsx
│   │   ├── StatCard.tsx
│   │   ├── DataTable.tsx
│   │   ├── FlowEditor/
│   │   ├── SpotEditor/
│   │   └── Charts/
│   └── types/                      # 공유 타입 정의
├── drizzle/                        # DB 마이그레이션 파일
├── public/
├── .env.local
├── drizzle.config.ts
├── next.config.ts
├── package.json
└── tsconfig.json
```

---

## 3. Bot UX Design

### 3-1. Dual Mode: Structured + Free Chat

봇은 두 가지 모드로 동작하며, 기본은 구조화 모드. 자유대화는 사용자가 명시적으로 선택해야 진입.

```
사용자 봇 시작
    │
    ▼
┌─────────────────────────────┐
│  Welcome + 메인 메뉴 (버튼)   │
│  🗺 길찾기                    │
│  🏖 관광지/맛집               │
│  🎫 예약하기                  │
│  💬 자유 대화  ← LLM 진입점   │
└────────┬────────────────────┘
         │
    ┌────┼────────┬───────────┐
    ▼    ▼        ▼           ▼
  길찾기  관광정보   예약      자유 대화
  (구조화) (구조화)  (구조화)   (LLM)
```

**구조화 모드**: 버튼/메뉴 기반. LLM 호출 최소 (지명 매핑에만 필요 시 사용). 비용 ~$0/메시지.
**자유대화 모드**: AI 대화. Intent Classifier 가드 적용. 비용 ~$0.01-0.04/메시지.

### 3-2. CMS-Managed Flows

플로우(메뉴/스텝/버튼)는 코드가 아닌 DB에 데이터로 저장. 관리자 CMS에서 코드 배포 없이 수정 가능.

```
관리자 CMS에서 플로우 편집
    │
    ▼ (DB 저장)
Flow Engine이 DB에서 플로우 정의를 읽어서 동적으로 실행
```

- 메인 메뉴 항목 추가/삭제/순서변경/활성화 토글
- 각 스텝의 메시지, 버튼 텍스트, 순서 수정
- 새 플로우 추가 (예: 축제 안내 플로우를 시즌에만 활성화)
- 다국어 메시지 관리
- 조건 분기 설정

순수 데이터로 안 되는 부분은 **서비스 액션 레지스트리**에 코드로 등록:

```typescript
const actionRegistry = {
  "search_transit_route": transitService.searchRoute,
  "get_taxi_deeplink":   taxiService.getDeepLink,
  "search_tourism_spot": tourismService.search,
  "search_restaurant":   tourismService.searchRestaurant,
  "search_events":       eventService.searchActive,
  "get_booking_link":    bookingService.getLink,
};
```

### 3-3. Adapter Pattern for Messenger Extensibility

새 메신저 추가 시 어댑터 하나만 구현하면 됨. 비즈니스 로직 변경 불필요.

```
Messenger Adapter (메신저별 1개)
  ├── whatsapp.adapter.ts
  ├── line.adapter.ts
  ├── wechat.adapter.ts    ← Phase 2
  └── telegram.adapter.ts  ← 필요 시
         │
         ▼
Message Handler (공통 1개)
  - 모드 라우팅 (menu / flow / free_chat)
  - 세션 관리
  - 응답 생성
```

```typescript
interface BotAdapter {
  readonly platform: Platform;
  verifyWebhook(req: Request): Promise<boolean>;
  handleChallenge?(req: Request): Response | null;
  parseIncoming(body: unknown): IncomingMessage[];
  sendMessage(chatId: string, message: OutgoingMessage): Promise<void>;
  sendTypingIndicator(chatId: string): Promise<void>;
  getConstraints(): PlatformConstraints;
}
```

### 3-4. Common Message Types

```typescript
type Platform = "whatsapp" | "line" | "wechat" | "telegram";

interface IncomingMessage {
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

interface OutgoingMessage {
  type: "text" | "buttons" | "carousel" | "location" | "image";
  text?: string;
  buttons?: MessageButton[];
  carousel?: CarouselItem[];
  location?: { latitude: number; longitude: number; label: string };
  imageUrl?: string;
  quickReplies?: QuickReply[];
}
```

### 3-5. Platform Constraints Handling

Message Handler가 플랫폼 제약에 맞게 응답을 자동 조정:

| Constraint | WhatsApp | LINE |
|-----------|----------|------|
| Max text length | 4,096 | 5,000 |
| Max buttons | 3 (→ List Message 전환) | 13 |
| Carousel | 미지원 (→ 분할 메시지) | 최대 12장 |
| Quick Reply | List Message 활용 | 네이티브 지원 |
| Rich UI | 제한적 | Flex Message (리치 카드) |

### 3-6. Webhook Security

| Item | WhatsApp | LINE |
|------|----------|------|
| Signature | X-Hub-Signature-256 (HMAC SHA-256) | X-Line-Signature (HMAC SHA-256) |
| Challenge | GET hub.verify_token | 없음 |
| Idempotency | platformMessageId로 중복 제거 | 동일 |
| Timeout | 5초 내 200 응답 필요 | 1초 내 200 응답 권장 |
| HTTPS | 필수 | 필수 |

### 3-7. QR/Short Link Entry

```
QR → https://piggyback.kr/start → Landing Page
     (또는 pgbk.kr/go)

Landing Page:
  - 브라우저 언어 감지로 자동 번역
  - [WhatsApp] [LINE] 선택 → 해당 봇으로 이동
  - UTM 파라미터로 유입 경로 추적
    /start?utm_source=airport&utm_campaign=summer2026
```

---

## 4. Database Schema

### 4-1. Overview

Neon Serverless Postgres + Drizzle ORM. 총 17 테이블, 6개 그룹.

| Group | Tables | Purpose |
|-------|--------|---------|
| Users/Sessions | 3 | 메신저 사용자, 세션 모드 추적, 대화 로그 |
| Flows | 3 | CMS 관리형 봇 대화 흐름 |
| Tourism Content | 4 | 장소/맛집 다국어 데이터, 지명 별칭 매핑 |
| Events | 1 | 행사/축제/공연 기간 한정 정보 |
| Ads/Revenue | 4 | 광고주, 캠페인, 노출 추적, 쿠폰 |
| Admin | 2 | 관리자 인증, 감사 로그 |

다국어 데이터는 모두 JSONB 컬럼으로 처리: `{ "en": "...", "ja": "...", "zh": "..." }`

### 4-2. Users & Sessions

```sql
CREATE TABLE users (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform       VARCHAR(20) NOT NULL,
  platform_uid   VARCHAR(255) NOT NULL,
  language       VARCHAR(10),
  first_seen_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata       JSONB DEFAULT '{}',
  UNIQUE(platform, platform_uid)
);

CREATE TABLE chat_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id),
  mode            VARCHAR(20) NOT NULL DEFAULT 'menu',
  active_flow_id  UUID REFERENCES flows(id),
  current_step_id UUID REFERENCES flow_steps(id),
  flow_context    JSONB DEFAULT '{}',
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at        TIMESTAMPTZ,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE chat_messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   UUID NOT NULL REFERENCES chat_sessions(id),
  user_id      UUID NOT NULL REFERENCES users(id),
  direction    VARCHAR(10) NOT NULL,
  content_type VARCHAR(20) NOT NULL,
  content      TEXT NOT NULL,
  metadata     JSONB DEFAULT '{}',
  tokens_used  INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_session ON chat_messages(session_id, created_at);
CREATE INDEX idx_messages_user ON chat_messages(user_id, created_at);
```

### 4-3. Flows (CMS-Managed)

```sql
CREATE TABLE flows (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(100) NOT NULL,
  icon          VARCHAR(10),
  display_names JSONB NOT NULL DEFAULT '{}',
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE flow_steps (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id    UUID NOT NULL REFERENCES flows(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  type       VARCHAR(20) NOT NULL,
  messages   JSONB NOT NULL DEFAULT '{}',
  api_action VARCHAR(100),
  config     JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(flow_id, step_order)
);

CREATE TABLE flow_options (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id      UUID NOT NULL REFERENCES flow_steps(id) ON DELETE CASCADE,
  labels       JSONB NOT NULL DEFAULT '{}',
  value        VARCHAR(255) NOT NULL,
  next_step_id UUID REFERENCES flow_steps(id),
  sort_order   INTEGER NOT NULL DEFAULT 0
);
```

### 4-4. Tourism Content

```sql
CREATE TABLE categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug       VARCHAR(50) NOT NULL UNIQUE,
  names      JSONB NOT NULL DEFAULT '{}',
  icon       VARCHAR(10),
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE tourism_spots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_place_id VARCHAR(255),
  name_ko         VARCHAR(255) NOT NULL,
  names           JSONB NOT NULL DEFAULT '{}',
  description     JSONB NOT NULL DEFAULT '{}',
  address_ko      TEXT,
  addresses       JSONB DEFAULT '{}',
  latitude        DECIMAL(10, 7),
  longitude       DECIMAL(10, 7),
  phone           VARCHAR(50),
  website         VARCHAR(500),
  images          JSONB DEFAULT '[]',
  rating          DECIMAL(2, 1),
  price_level     INTEGER,
  opening_hours   JSONB DEFAULT '{}',
  tags            JSONB DEFAULT '[]',
  source          VARCHAR(20) NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  embedding       VECTOR(1536),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE spot_categories (
  spot_id     UUID NOT NULL REFERENCES tourism_spots(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (spot_id, category_id)
);

CREATE TABLE location_aliases (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spot_id  UUID REFERENCES tourism_spots(id) ON DELETE CASCADE,
  alias    VARCHAR(255) NOT NULL,
  language VARCHAR(10) NOT NULL,
  source   VARCHAR(20) NOT NULL,
  UNIQUE(alias, language)
);

CREATE INDEX idx_aliases_search ON location_aliases(language, alias);
CREATE INDEX idx_spots_embedding ON tourism_spots
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

### 4-5. Events (행사/축제/공연)

```sql
CREATE TABLE events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ko     VARCHAR(255) NOT NULL,
  names       JSONB NOT NULL DEFAULT '{}',
  description JSONB NOT NULL DEFAULT '{}',
  category    VARCHAR(50) NOT NULL,       -- 'festival' | 'concert' | 'exhibition' | 'performance'
  venue_name  JSONB DEFAULT '{}',         -- 다국어 장소명
  address_ko  TEXT,
  addresses   JSONB DEFAULT '{}',
  latitude    DECIMAL(10, 7),
  longitude   DECIMAL(10, 7),
  starts_at   TIMESTAMPTZ NOT NULL,
  ends_at     TIMESTAMPTZ NOT NULL,
  recurrence  VARCHAR(20),               -- 'daily' | 'weekly' | null (단발성)
  price_info  JSONB DEFAULT '{}',         -- 다국어 요금 안내 (무료/유료/가격)
  booking_url VARCHAR(500),               -- 예약 링크
  images      JSONB DEFAULT '[]',
  source      VARCHAR(20) NOT NULL,       -- 'curated' | 'tour_api'
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_events_dates ON events(starts_at, ends_at) WHERE is_active = TRUE;
```

### 4-6. Ads & Revenue

```sql
CREATE TABLE advertisers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(255) NOT NULL,
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE ad_campaigns (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id     UUID NOT NULL REFERENCES advertisers(id),
  name              VARCHAR(255) NOT NULL,
  type              VARCHAR(20) NOT NULL,
  content           JSONB NOT NULL DEFAULT '{}',
  target_categories JSONB DEFAULT '[]',
  target_languages  JSONB DEFAULT '[]',
  budget_total      DECIMAL(12, 2),
  budget_spent      DECIMAL(12, 2) DEFAULT 0,
  starts_at         TIMESTAMPTZ NOT NULL,
  ends_at           TIMESTAMPTZ NOT NULL,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE ad_impressions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES ad_campaigns(id),
  user_id     UUID NOT NULL REFERENCES users(id),
  session_id  UUID REFERENCES chat_sessions(id),
  event_type  VARCHAR(20) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_impressions_campaign ON ad_impressions(campaign_id, created_at);

CREATE TABLE coupons (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id    UUID NOT NULL REFERENCES ad_campaigns(id),
  code           VARCHAR(50) NOT NULL UNIQUE,
  description    JSONB NOT NULL DEFAULT '{}',
  discount_type  VARCHAR(20) NOT NULL,
  discount_value DECIMAL(10, 2) NOT NULL,
  max_uses       INTEGER,
  used_count     INTEGER NOT NULL DEFAULT 0,
  expires_at     TIMESTAMPTZ NOT NULL,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE coupon_redemptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id   UUID NOT NULL REFERENCES coupons(id),
  user_id     UUID NOT NULL REFERENCES users(id),
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 4-7. Admin

```sql
CREATE TABLE admin_users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) NOT NULL UNIQUE,
  name          VARCHAR(100) NOT NULL,
  role          VARCHAR(20) NOT NULL DEFAULT 'editor',
  password_hash VARCHAR(255) NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE admin_audit_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id     UUID NOT NULL REFERENCES admin_users(id),
  action       VARCHAR(50) NOT NULL,
  target_table VARCHAR(50),
  target_id    UUID,
  changes      JSONB DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_admin ON admin_audit_logs(admin_id, created_at);
```

---

## 5. AI Service Design

### 5-1. Cost Strategy: Cheap Inference APIs

OpenAI 대신 저렴한 추론 API 사용. LLM 사용이 제한적이므로 자체 호스팅 불필요.

| Purpose | Model | Provider | Cost |
|---------|-------|----------|------|
| Intent classification | Llama 3.1 8B | Groq | **Free** |
| Location mapping (Stage 3) | Llama 3.1 8B | Groq | **Free** |
| Free chat responses | Llama 3.3 70B | Groq | ~$0.59/$0.79 per 1M tokens |
| Fallback | Llama 3.1 70B | Together AI | ~$0.88 per 1M tokens |
| Embeddings | BGE-M3 | Hugging Face API | **Free** |

**Monthly cost estimate (MAU 10,000)**: ~$5-15/month (95% savings vs OpenAI)

### 5-2. Provider Abstraction

```typescript
interface LLMProvider {
  chat(params: {
    model: string;
    messages: ChatMessage[];
    temperature?: number;
    maxTokens?: number;
    responseFormat?: "text" | "json";
  }): Promise<LLMResponse>;
  embed(text: string): Promise<number[]>;
}

// Implementations: GroqProvider, TogetherProvider, OpenAIProvider, SelfHostedProvider
```

### 5-3. LLM Router

작업 종류에 따라 적절한 provider + model 자동 선택.

```typescript
class LLMRouter {
  // 경량 작업 → Groq 8B (무료)
  async lightweight(messages: ChatMessage[]): Promise<LLMResponse>;

  // 자유대화 → Groq 70B (저렴)
  async conversation(messages: ChatMessage[]): Promise<LLMResponse>;

  // Groq 장애 시 Together AI로 자동 폴백
  private async withFallback(...): Promise<LLMResponse>;
}
```

### 5-4. AI Processing Pipeline

```
사용자 메시지
    │
    ▼
① Language Service (franc 라이브러리, LLM 미사용)
    │
    ├─ 구조화 모드 ─────────────────────┐
    │                                   │
    ▼                                   │
② Location Resolver (3-stage)          │
    Stage 1: DB 별칭 검색 (비용 $0)      │
    Stage 2: 임베딩 유사검색 (비용 낮음)  │
    Stage 3: LLM 추론 (최후 수단)       │
    └─ 성공 시 별칭 자동 저장 (학습)     │
                                        │
    ├─ 자유대화 모드 ───────────────────┐│
    │                                  ││
    ▼                                  ││
③ Intent Classifier (Groq 8B, 무료)   ││
    ├─ off_topic → 정중한 거절          ││
    └─ 허용 → Chat Service             ││
              (Groq 70B)               ││
    │                                  ││
    ▼                                  ▼▼
④ Ad Service (DB 조회, LLM 미사용)
    └─ 매칭되는 광고 삽입
```

### 5-5. Location Resolver: 3-Stage Architecture

"대충 검색해도 찾아주는" 기능의 핵심. 비용 최적화를 위한 계층 구조.

```
Stage 1: DB 별칭 검색     → 비용 $0, 즉시 응답
Stage 2: 임베딩 유사검색   → 비용 ~$0.0005
Stage 3: GPT 추론         → 비용 ~$0.001 (Groq 8B 무료)

자가 학습: Stage 3 성공 → 별칭 자동 저장 → 다음번 Stage 1에서 히트
시간이 지날수록 Stage 1 히트율 상승, LLM 호출 감소
```

### 5-6. Intent Classification Guard

자유대화 모드에서만 동작. 관광과 무관한 질문 차단.

```typescript
type Intent = "tourism" | "transit" | "booking" | "general_info" | "greeting" | "off_topic";
```

- off_topic → GPT 메인 호출 없이 고정 다국어 거절 메시지 반환
- 허용 주제 → Chat Service로 위임

---

## 6. External API Integration

### 6-1. Common API Client

모든 외부 API 호출이 공유하는 기반 레이어: 재시도 (지수 백오프), 캐싱, 에러 처리, 타임아웃.

```typescript
interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: { code: string; message: string; source: string };
  cached: boolean;
}
```

**Caching TTL**:

| Data Type | TTL | Reason |
|-----------|-----|--------|
| Bus/subway routes | 24h | 노선 변경 드뭄 |
| Real-time arrival | 30s | 실시간성 필요 |
| Tourism spot info | 6h | 영업시간 변경 가능 |
| Reviews/ratings | 1h | 적당한 신선도 |
| Booking availability | 0 (no cache) | 실시간 정확성 필수 |

### 6-2. Transit APIs

| API | Purpose | Cost |
|-----|---------|------|
| TAGO (교통정보서비스) | 버스 노선, 정류소 검색, 실시간 도착 | Free (일 10,000건) |
| 부산교통공사 API | 지하철/경전철 시간표, 실시간 도착 | Free |
| Google Maps Directions | 대중교통 경로 검색, 지오코딩 | ~$100/month (크레딧 차감 후) |
| Naver Maps Directions | 한국 내 경로 보완, 지오코딩 | Free (일 100,000건) |

**Processing**: Google + Naver 동시 조회 → 병합/중복 제거/정렬 → TAGO/부산교통공사로 실시간 도착 정보 보강

**Fallback**: 둘 다 성공(병합) > Google만(반환) > Naver만(반환) > 둘 다 실패(에러 + 택시 대안)

### 6-3. Taxi/Ride-Hailing Integration

대중교통 경로와 함께 택시 옵션을 제공. 배차와 결제는 외부 앱에서 처리하며, 봇은 딥링크 생성만 담당.

| Service | Deep Link Format | Notes |
|---------|-----------------|-------|
| 카카오T | `kakaot://route?ep_lat={lat}&ep_lng={lng}&ep_name={name}` | 국내 점유율 1위 |
| Uber | `uber://?action=setPickup&dropoff[latitude]={lat}&dropoff[longitude]={lng}&dropoff[nickname]={name}` | 외국인 친화적 |

```
봇 응답 예시:
🚇 지하철: 부산역 → 해운대 | 45분 | 1,450원
🚌 버스: 1003번 | 50분 | 1,450원
🚕 택시: 약 30분 | ~18,000원
   [카카오T로 호출 →]  [Uber로 호출 →]
```

택시 예상 요금은 Google Maps Distance Matrix API의 거리/시간 데이터로 추정 (부산 택시 기본요금 + km당 요금 계산).
택시 딥링크 생성은 `TransitService` 내에서 처리하며, 별도 외부 API 연동 불필요.

### 6-4. Tourism APIs

| API | Purpose | Cost |
|-----|---------|------|
| TourAPI (한국관광공사) | 관광지/맛집/축제 검색 (다국어 지원) | Free (일 10,000건) |
| Google Places | 텍스트 검색, 상세(리뷰/사진), 주변 검색 | Google 크레딧 공유 |
| 자체 큐레이션 DB | 직접 검수한 고품질 데이터 | $0 |

**Data priority**: 자체 큐레이션 DB (1순위) → TourAPI (2순위) → Google Places (3순위)
**Deduplication**: google_place_id 또는 좌표 근접도 (50m 이내)

### 6-5. Booking APIs

| API | Purpose | Cost |
|-----|---------|------|
| Klook | 액티비티/투어 검색, 어필리에이트 링크 | Free (수수료 수입) |
| KKday | 투어/티켓 검색, 어필리에이트 링크 | Free (수수료 수입) |

봇 내에서 직접 예약을 처리하지 않고, 어필리에이트 딥링크로 외부 예약 사이트로 연결.

### 6-6. Monthly API Cost Estimate (MAU 10,000)

| API | Monthly Cost |
|-----|-------------|
| Google Maps + Places | ~$100 (after $200 credit) |
| Naver Maps | $0 |
| TAGO + 부산교통공사 | $0 |
| TourAPI | $0 |
| Klook/KKday | $0 (affiliate revenue) |
| AI (Groq + Together) | ~$5-15 |
| **Total** | **~$105-115/month** |

---

## 7. Admin CMS Design

### 7-1. Authentication & Authorization

NextAuth.js v5 Credentials Provider. 역할 기반 접근 제어.

| Role | Permissions |
|------|------------|
| super_admin | 전체 권한 |
| admin | 콘텐츠 + 광고 + 대화로그 + 분석 |
| editor | 콘텐츠 관리만 (플로우, 장소) |
| viewer | 조회만 (분석, 대화로그) |

### 7-2. CMS Pages

**Dashboard** (`/admin/dashboard`):
- 오늘의 현황 (활성유저, 신규유저, 예약건수, AI비용)
- 플랫폼별/언어별 분포
- 인기 플로우 순위
- 최근 대화 프리뷰

**Flow Management** (`/admin/flows`):
- 플로우 목록 (드래그 순서 변경, 활성화 토글)
- 플로우 에디터 (스텝 추가/편집/삭제, 다국어 메시지, 버튼 관리, API 액션 연결)
- 미리보기 기능

**Tourism Spot Management** (`/admin/spots`):
- 장소 목록 (검색, 카테고리/소스/활성상태 필터)
- 장소 편집 (기본 정보, 다국어 정보, 영업시간, 이미지)
- 지명 별칭 관리 (수동 추가 + AI 자동 생성)

**Event Management** (`/admin/events`):
- 행사/축제/공연 목록 (진행 중/예정/종료 필터, 카테고리 필터)
- 행사 등록/편집 (기본 정보, 다국어 정보, 기간, 요금, 예약 링크, 반복 설정)
- TourAPI 축제 데이터 자동 가져오기 기능
- 진행 중인 행사 자동 봇 노출 (플로우 연동)

**Ad Management** (`/admin/ads`):
- 광고주 관리
- 캠페인 관리 (타입: 스폰서 추천/쿠폰/네이티브, 타겟팅, 예산/기간, 성과 지표)
- 쿠폰 관리 (발급/사용 추적)

**Conversation Viewer** (`/admin/conversations`):
- 세션 목록 (플랫폼/언어/모드/AI사용 필터)
- 대화 내용 뷰어 (메시지, 버튼 선택, 위치 공유 표시)
- 메타 정보 (세션 모드 전환, 지명 매핑 이력, 토큰 사용량, 광고 노출)

**Analytics** (`/admin/analytics`):
- 사용량 통계 (DAU 트렌드, 플랫폼/언어/모드 분포, 플로우 완료율, 지명 매핑 히트율)
- AI 비용 추적 (일별 비용 차트, 용도별 내역, 최적화 제안)
- 광고 성과 (CTR, 쿠폰 사용률, 캠페인별 ROI)

**Settings** (`/admin/settings`):
- 관리자 계정 관리 (CRUD, 역할 할당)
- 봇 설정 (Welcome 메시지, 기본 언어, 자유대화 활성화, AI 비용 상한, 자유대화 제한, off_topic 거절 메시지)
- 외부 API 상태 모니터링 — 연동된 외부 API(Google Maps, Naver Maps, TAGO, TourAPI, Groq 등)의 실시간 상태, 평균 응답시간, 최근 에러 건수 표시. 장애 발생 시 관리자 알림

---

## 8. Environment Variables

```env
# WhatsApp Business API
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_VERIFY_TOKEN=
WHATSAPP_APP_SECRET=

# LINE Messaging API
LINE_CHANNEL_ACCESS_TOKEN=
LINE_CHANNEL_SECRET=

# Google
GOOGLE_MAPS_API_KEY=
GOOGLE_PLACES_API_KEY=

# Naver
NAVER_CLIENT_ID=
NAVER_CLIENT_SECRET=

# Public Data APIs
TAGO_API_KEY=
BUSAN_TRANSIT_API_KEY=
TOUR_API_KEY=

# Booking Affiliates
KLOOK_API_KEY=
KLOOK_AFFILIATE_ID=
KKDAY_API_KEY=
KKDAY_AFFILIATE_ID=

# AI
GROQ_API_KEY=
TOGETHER_API_KEY=
HF_API_TOKEN=

# AI Model Config
LLM_LIGHT_PROVIDER=groq
LLM_LIGHT_MODEL=llama-3.1-8b-instant
LLM_CHAT_PROVIDER=groq
LLM_CHAT_MODEL=llama-3.3-70b-versatile

# Database
DATABASE_URL=

# Auth
NEXTAUTH_SECRET=
NEXTAUTH_URL=

# App
NEXT_PUBLIC_APP_URL=https://piggyback.kr
```

---

## 9. Non-Goals (Out of Scope)

- 결제 처리 (예약은 외부 플랫폼 딥링크로 연결)
- WeChat 봇 (Phase 2)
- 네이티브 앱 개발
- 실시간 채팅 (봇 대화만, 사람과의 라이브챗 없음)
- 다른 도시 지원 (부산 전용)

---

## 10. Deployment Considerations

### 10-1. Vercel Serverless Constraints

Vercel Serverless Functions는 응답 반환 후 백그라운드 실행이 제한적. 웹훅 처리 시 주의 필요.

**대응 전략**:
- `waitUntil()` API 활용: Vercel은 `waitUntil()`을 통해 응답 반환 후에도 추가 작업 실행 가능 (로그 저장, 캐시 업데이트 등)
- 메시지 처리 자체는 응답 전에 완료하되, 부수 작업(로그, 통계, 별칭 캐싱)은 `waitUntil()`로 처리
- WhatsApp 5초 제한, LINE 1초 권장을 고려하여 즉시 200 반환 후 처리

### 10-2. Function Timeout

- Vercel Hobby: 10초 / Pro: 60초
- 외부 API 동시 호출(Google + Naver)은 `Promise.all`로 병렬화하여 시간 단축
- Pro 플랜 사용 권장 (봇 웹훅의 안정적 처리를 위해)

---

## 11. Risk & Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| WhatsApp Business API 승인 지연 | Phase 1 지연 | LINE 먼저 개발, WhatsApp 병행 신청 |
| Groq 무료 티어 제한/변경 | AI 비용 증가 | Together AI 폴백 + provider 추상화로 즉시 교체 |
| 외부 API 장애 | 서비스 중단 | Fallback 전략 (Google↔Naver), 캐시 |
| 지명 매핑 정확도 부족 | 사용자 불만 | 3-stage 계층 + 별칭 자가 학습으로 개선 |
| 1인 개발 병목 | 일정 지연 | Sub-project 분리, MVP 범위 조정 가능 |
