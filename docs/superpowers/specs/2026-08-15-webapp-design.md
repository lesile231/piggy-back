# Web App Design Spec

> **Date**: 2026-08-15
> **Project**: PiggyBack (piggy_back)
> **Depends on**: SP1 (Core Foundation), SP2 (Bot Integration), SP3 (Tourism & Transit)
> **Status**: Design approved, pending implementation plan

---

## 1. Overview

### 1-1. What

PiggyBack 프로젝트에 사용자 대면 웹사이트와 관리자 CMS를 추가.

- **사용자 웹**: 외국인 관광객용 다국어 관광정보/행사/검색 웹사이트 (SSR, SEO 최적화)
- **Admin CMS**: 관리자용 콘텐츠 관리 도구 (한국어, 관광지/행사/플로우 CRUD)

### 1-2. Why

봇만으로는 SEO 노출, 웹 검색 유입, 브라우저 직접 접근이 불가능. 웹사이트를 통해:
- Google/Naver 검색으로 부산 관광정보 직접 노출
- 봇 진입점(QR 랜딩) 외에 독립적 정보 제공
- 관리자가 코드 배포 없이 콘텐츠 직접 관리

### 1-3. Approach

**Full SSR** — 모든 사용자 웹 페이지를 Next.js Server Component로 구현.

| 고려한 대안 | 불채택 이유 |
|------------|-----------|
| Static Generation (SSG) | DB 콘텐츠 변경 시 rebuild 필요, 실시간성 부족 |
| Client-side SPA | SEO 불가, 초기 로딩 느림 |

SSR 장점: SEO 완전 지원, DB 변경 즉시 반영, Server Component에서 Repository 직접 호출 가능.

---

## 2. Tech Stack Decisions

### 2-1. UI

| Area | Technology | Reason |
|------|-----------|--------|
| 사용자 웹 | Tailwind CSS + 커스텀 컴포넌트 | 경량, 빠른 로딩, 이미 설치됨 |
| Admin CMS | shadcn/ui (설치 필요) | DataTable, Form, Dialog 등 복잡한 UI에 적합 |

### 2-2. i18n (Internationalization)

**URL 기반 라우팅**: `/en/spots`, `/ja/events`, `/zh/spots`

| Layer | Approach |
|-------|---------|
| URL 라우팅 | `app/[lang]/` 동적 세그먼트 + `proxy.ts`에서 Accept-Language → 자동 리다이렉트 |
| UI 번역 (메뉴, 버튼, 라벨) | JSON 딕셔너리 (`src/app/[lang]/dictionaries/en.json`, `ja.json` 등) |
| DB 콘텐츠 (관광지명, 설명) | 기존 JSONB `LocalizedText` + `localize()` 함수 그대로 활용 |
| Locale 공유 | `next/root-params`의 `lang` getter 사용 (prop drilling 불필요) |

**지원 언어**: `en`, `ja`, `zh`, `ko` (확장 가능)

### 2-3. Authentication (Admin)

| Item | Decision |
|------|---------|
| 방식 | 자체 구현 (NextAuth.js는 오버스펙) |
| 비밀번호 | bcrypt로 `admin_users.password_hash` 검증 |
| 세션 | HTTP-only cookie (JWT 토큰) |
| 라우트 보호 | Admin `layout.tsx`에서 JWT 쿠키 검증 (Server Component) |

### 2-4. Data Access

| Layer | Pattern |
|-------|--------|
| 사용자 웹 읽기 | Server Component에서 기존 Repository/Service 직접 호출 |
| Admin 쓰기 | Server Actions (`"use server"`) |
| 이미지 | URL 입력 방식 (파일 업로드는 MVP 이후) |

---

## 3. User-Facing Web

### 3-1. Route Structure

```
src/app/
├── [lang]/                          # 다국어 동적 세그먼트
│   ├── layout.tsx                   # 사용자 웹 레이아웃 (헤더, 푸터, lang 설정)
│   ├── page.tsx                     # 홈페이지
│   ├── spots/
│   │   ├── page.tsx                 # 관광지 목록
│   │   └── [id]/page.tsx            # 관광지 상세
│   ├── events/
│   │   ├── page.tsx                 # 행사 목록
│   │   └── [id]/page.tsx            # 행사 상세
│   ├── search/page.tsx              # 통합 검색 결과
│   └── dictionaries/
│       ├── en.json
│       ├── ja.json
│       ├── zh.json
│       └── ko.json
├── start/page.tsx                   # QR/숏링크 랜딩 (기존, [lang] 밖)
├── (admin)/                         # Admin CMS 라우트 그룹
│   └── ...
└── api/                             # API 라우트 (기존 webhooks 등)
```

### 3-2. Pages

#### Home (`/[lang]`)

- PiggyBack 소개 + 봇 시작 CTA (WhatsApp/LINE 버튼)
- 인기 관광지 카드 (DB에서 상위 6개)
- 진행 중인 행사 하이라이트 (DB에서 현재 활성 이벤트 3개)
- 카테고리별 빠른 탐색 링크

**Data**: `SpotRepository.searchByName("", 6)` + `EventRepository.getActiveEvents({ date: now, limit: 3 })`

#### Spots List (`/[lang]/spots`)

- 관광지 카드 그리드 (이미지, 이름, 카테고리, 별점)
- 카테고리 필터 (탭 또는 드롭다운)
- 검색 입력 (query parameter `?q=`)
- 페이지네이션 (offset 기반, `?page=`)

**Data**: `SpotRepository.searchByName(q)` 또는 `SpotRepository.searchByCategory(category)`

#### Spot Detail (`/[lang]/spots/[id]`)

- 이미지 갤러리
- 다국어 이름/설명 (`localize()` 적용)
- 지도 표시 (위도/경도, 정적 이미지 또는 embed)
- 기본 정보: 주소, 전화, 웹사이트, 영업시간
- 별점/가격 수준
- 봇으로 길찾기 CTA

**Data**: `SpotRepository.getById(id)`

#### Events List (`/[lang]/events`)

- 행사 카드 리스트 (이미지, 이름, 기간, 장소)
- 상태 필터: 진행 중 / 예정 / 전체
- 카테고리 필터: festival / concert / exhibition / performance
- 페이지네이션

**Data**: `EventRepository.getActiveEvents({ date, category, limit })`

#### Event Detail (`/[lang]/events/[id]`)

- 이미지
- 다국어 이름/설명
- 기간 (시작~종료, 반복 패턴 표시)
- 장소/주소, 지도
- 요금 정보
- 예약 링크 (외부 URL)

**Data**: `EventRepository.getById(id)`

#### Search (`/[lang]/search?q=`)

- 통합 검색: 관광지 + 행사 동시 검색
- 섹션별 결과 표시 ("관광지" 섹션, "행사" 섹션)
- 결과 없을 시 봇으로 안내

**Data**: `SpotRepository.searchByName(q)` + `EventRepository` 이름 검색

### 3-3. Layout & Components

#### User Layout (`app/[lang]/layout.tsx`)

```
┌─────────────────────────────────────┐
│  Header: Logo | Nav | Lang Switcher │
├─────────────────────────────────────┤
│                                     │
│           Page Content              │
│                                     │
├─────────────────────────────────────┤
│  Footer: Links | Copyright          │
└─────────────────────────────────────┘
```

- **Header**: PiggyBack 로고, 네비게이션 (홈/관광지/행사), 언어 선택 드롭다운
- **Footer**: 봇 링크, 저작권, 운영사 정보
- **Lang Switcher**: 현재 페이지의 언어만 변경 (경로 유지)
- **html lang 속성**: `lang` 파라미터에서 동적 설정

#### Shared Components

| Component | Description |
|-----------|-------------|
| `SpotCard` | 관광지 카드 (이미지, 이름, 카테고리 배지, 별점) |
| `EventCard` | 행사 카드 (이미지, 이름, 기간, 장소, 상태 배지) |
| `CategoryFilter` | 카테고리 필터 탭/칩 |
| `SearchInput` | 검색 입력 + 폼 submit → query parameter |
| `Pagination` | 페이지 네비게이션 (URL 기반) |
| `LangSwitcher` | 언어 전환 드롭다운 (Client Component) |
| `MapEmbed` | 위도/경도 기반 지도 표시 (정적 이미지) |
| `ImageGallery` | 이미지 목록 표시 |

### 3-4. SEO

- `generateMetadata()` per page: title, description, og:image
- 다국어 alternate link (`hreflang`)
- JSON-LD structured data (TouristAttraction, Event schema)
- `generateStaticParams`는 사용하지 않음 (SSR 방식, DB 변경 즉시 반영)

---

## 4. Admin CMS

### 4-1. Route Structure

```
src/app/(admin)/admin/
├── login/
│   ├── layout.tsx                   # 로그인 레이아웃 (인증 불필요, 심플)
│   └── page.tsx                     # 로그인 페이지
├── (authenticated)/
│   ├── layout.tsx                   # 인증된 Admin 레이아웃 (사이드바, 헤더, JWT 검증)
│   ├── dashboard/page.tsx           # 대시보드 (TODO[MVP]: 간단한 현황)
│   ├── spots/
│   │   ├── page.tsx                 # 관광지 목록
│   │   ├── new/page.tsx             # 관광지 생성
│   │   └── [id]/edit/page.tsx       # 관광지 수정
│   ├── events/
│   │   ├── page.tsx                 # 행사 목록
│   │   ├── new/page.tsx             # 행사 생성
│   │   └── [id]/edit/page.tsx       # 행사 수정
│   └── flows/
│       ├── page.tsx                 # 플로우 목록
│       └── [id]/edit/page.tsx       # 플로우 편집 (스텝/옵션 관리)
```

### 4-2. Authentication Flow

```
사용자 → /admin/* 접근
    │
    ▼
Admin layout.tsx (Server Component):
    JWT 쿠키 검증 (verifyAdminSession)
    ├─ 없음/만료/무효 → redirect("/admin/login")
    └─ 유효 → 렌더링 (admin 정보를 children에 전달)

※ /admin/login은 별도 레이아웃 (인증 불필요)

로그인 (/admin/login):
    1. 이메일 + 비밀번호 입력
    2. Server Action으로 처리
    3. admin_users 테이블에서 이메일 조회
    4. bcrypt.compare(password, passwordHash)
    5. 성공 → JWT 토큰 생성 → HTTP-only 쿠키 설정 → /admin/dashboard 리다이렉트
    6. 실패 → 에러 메시지 표시
```

**JWT Payload**:
```typescript
interface AdminJwtPayload {
  sub: string;       // admin_users.id
  email: string;
  name: string;
  role: string;      // 'super_admin' | 'admin' | 'editor' | 'viewer'
  iat: number;
  exp: number;       // 24시간
}
```

### 4-3. Layout

```
┌───────────────────────────────────────────┐
│  Header: PiggyBack Admin | 관리자명 | 로그아웃  │
├──────┬────────────────────────────────────┤
│      │                                    │
│ Side │          Page Content              │
│ bar  │                                    │
│      │                                    │
│ 관광지 │                                    │
│ 행사  │                                    │
│ 플로우 │                                    │
│      │                                    │
└──────┴────────────────────────────────────┘
```

- **Sidebar**: 네비게이션 메뉴 (관광지, 행사, 플로우)
- **Header**: 로고, 로그인 유저 이름, 로그아웃 버튼
- **UI**: shadcn/ui (한국어)

### 4-4. Tourism Spot Management

#### List (`/admin/spots`)

- shadcn DataTable: 이름(한국어), 카테고리, 소스, 활성 상태, 별점
- 검색: 이름 검색 (한국어/영어)
- 필터: 카테고리, 소스(curated/tour_api/google_places), 활성/비활성
- 액션: 새로 만들기 버튼, 행별 편집/삭제

#### Create/Edit (`/admin/spots/new`, `/admin/spots/[id]/edit`)

- **기본 정보**: 한국어 이름, 카테고리 선택 (multi-select), 소스
- **다국어 탭**: en / ja / zh / ko 탭에서 이름, 설명, 주소 각각 입력
- **위치**: 위도, 경도 입력
- **부가 정보**: 전화번호, 웹사이트, 별점, 가격 수준
- **영업시간**: JSONB 에디터 (또는 요일별 입력)
- **이미지**: URL 입력 (복수), TODO[MVP]: 파일 업로드
- **활성/비활성 토글**

**Server Action**: `createSpot(formData)` / `updateSpot(id, formData)` / `deleteSpot(id)`
→ Drizzle ORM으로 `tourismSpots` 테이블 직접 조작

### 4-5. Event Management

#### List (`/admin/events`)

- DataTable: 이름, 카테고리, 기간, 장소, 활성 상태
- 필터: 상태 (진행 중/예정/종료), 카테고리 (festival/concert/exhibition/performance)
- 액션: 새로 만들기, 편집, 삭제

#### Create/Edit (`/admin/events/new`, `/admin/events/[id]/edit`)

- **기본 정보**: 한국어 이름, 카테고리, 소스
- **다국어 탭**: en / ja / zh / ko 탭에서 이름, 설명, 장소명, 주소, 요금 안내
- **기간**: 시작일시, 종료일시 (날짜/시간 picker)
- **반복**: recurrence 선택 (없음/daily/weekly)
- **위치**: 위도, 경도
- **예약 URL**: 외부 예약 링크
- **이미지**: URL 입력
- **활성/비활성 토글**

**Server Action**: `createEvent(formData)` / `updateEvent(id, formData)` / `deleteEvent(id)`
→ Drizzle ORM으로 `events` 테이블 직접 조작

### 4-6. Flow Management

#### List (`/admin/flows`)

- DataTable: 이름, 아이콘, 표시 이름, 활성 상태, 정렬 순서
- 활성/비활성 토글 (인라인)
- 드래그 앤 드롭 순서 변경 (TODO[MVP]: 수동 sort_order 입력으로 대체)
- 편집 버튼 → 플로우 상세

#### Flow Editor (`/admin/flows/[id]/edit`)

- **플로우 기본 정보**: 이름, 아이콘, 다국어 표시 이름 (en/ja/zh/ko)
- **스텝 목록**: 순서대로 표시
  - 각 스텝: type, 다국어 메시지 편집, apiAction 지정 (선택)
  - 스텝 추가/삭제/순서 변경
- **스텝별 옵션 (버튼)**: labels (다국어), value, 다음 스텝 연결
  - 옵션 추가/삭제/순서 변경
- **미리보기**: TODO[MVP] (채팅 시뮬레이션은 후순위)

**Server Action**: `updateFlow(id, data)` / `createStep(flowId, data)` / `updateStep(id, data)` / `deleteStep(id)` / `createOption(stepId, data)` / `updateOption(id, data)` / `deleteOption(id)`

---

## 5. i18n Implementation

### 5-1. Proxy (locale redirect)

```typescript
// src/proxy.ts
// 역할: i18n locale 리다이렉트만 담당.
// Admin 인증은 Admin layout.tsx에서 Server Component로 처리.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const LOCALES = ["en", "ja", "zh", "ko"];
const DEFAULT_LOCALE = "en";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if locale already in path
  const hasLocale = LOCALES.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`,
  );
  if (hasLocale) return;

  // Detect locale from Accept-Language
  const acceptLang = request.headers.get("accept-language") ?? "";
  const detected = detectLocale(acceptLang);

  request.nextUrl.pathname = `/${detected}${pathname}`;
  return NextResponse.redirect(request.nextUrl);
}

function detectLocale(acceptLanguage: string): string {
  for (const locale of LOCALES) {
    if (acceptLanguage.toLowerCase().includes(locale)) {
      return locale;
    }
  }
  return DEFAULT_LOCALE;
}

// matcher: 사용자 웹 경로에만 적용. API, static, admin, start 제외.
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|admin|start).*)",
  ],
};
```

### 5-2. Dictionary System

```typescript
// src/app/[lang]/dictionaries.ts
import { lang } from "next/root-params";
import { notFound } from "next/navigation";

const dictionaries = {
  en: () => import("./dictionaries/en.json").then((m) => m.default),
  ja: () => import("./dictionaries/ja.json").then((m) => m.default),
  zh: () => import("./dictionaries/zh.json").then((m) => m.default),
  ko: () => import("./dictionaries/ko.json").then((m) => m.default),
};

export type Locale = keyof typeof dictionaries;

export const LOCALES: Locale[] = ["en", "ja", "zh", "ko"];

export const hasLocale = (locale: string): locale is Locale =>
  locale in dictionaries;

export const getDictionary = async () => {
  const locale = await lang();
  if (!hasLocale(locale)) notFound();
  return dictionaries[locale]();
};
```

### 5-3. Dictionary Schema (Example)

```json
// dictionaries/en.json
{
  "common": {
    "home": "Home",
    "spots": "Tourism Spots",
    "events": "Events",
    "search": "Search",
    "noResults": "No results found",
    "tryBot": "Try our chatbot for more help",
    "viewMore": "View More",
    "back": "Back"
  },
  "home": {
    "title": "Discover Busan",
    "subtitle": "Your complete guide to Busan travel",
    "popularSpots": "Popular Spots",
    "upcomingEvents": "What's Happening",
    "startChat": "Chat with PiggyBack"
  },
  "spots": {
    "title": "Tourism Spots",
    "searchPlaceholder": "Search spots...",
    "allCategories": "All",
    "rating": "Rating",
    "address": "Address",
    "hours": "Opening Hours",
    "phone": "Phone",
    "website": "Website",
    "getDirections": "Get Directions via Bot"
  },
  "events": {
    "title": "Events & Festivals",
    "ongoing": "Ongoing",
    "upcoming": "Upcoming",
    "all": "All",
    "period": "Period",
    "venue": "Venue",
    "price": "Price",
    "bookNow": "Book Now",
    "free": "Free"
  },
  "search": {
    "title": "Search Results",
    "placeholder": "Search spots and events...",
    "spotsSection": "Tourism Spots",
    "eventsSection": "Events"
  }
}
```

### 5-4. DB Content Localization

DB 콘텐츠는 기존 `LocalizedText` JSONB 구조 + `localize()` 함수 활용:

```typescript
// Server Component에서의 사용 패턴
import { lang } from "next/root-params";
import { localize } from "@/types/common";

export default async function SpotDetail() {
  const locale = await lang();
  const spot = await spotRepo.getById(id);

  return (
    <h1>{localize(spot.names, locale)}</h1>
    <p>{localize(spot.description, locale)}</p>
  );
}
```

---

## 6. File Structure (New Files)

```
src/
├── proxy.ts                              # Locale redirect + Admin auth guard (NEW)
├── app/
│   ├── [lang]/                           # 사용자 웹 (NEW)
│   │   ├── layout.tsx
│   │   ├── page.tsx                      # 홈
│   │   ├── spots/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── events/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── search/page.tsx
│   │   └── dictionaries/
│   │       ├── en.json
│   │       ├── ja.json
│   │       ├── zh.json
│   │       └── ko.json
│   ├── (admin)/admin/                    # Admin CMS (NEW)
│   │   ├── login/
│   │   │   ├── layout.tsx                # 로그인 레이아웃 (인증 불필요)
│   │   │   └── page.tsx
│   │   └── (authenticated)/
│   │       ├── layout.tsx                # 인증된 레이아웃 (JWT 검증, 사이드바)
│   │       ├── dashboard/page.tsx
│   │       ├── spots/
│   │       │   ├── page.tsx
│   │       │   ├── new/page.tsx
│   │       │   └── [id]/edit/page.tsx
│   │       ├── events/
│   │       │   ├── page.tsx
│   │       │   ├── new/page.tsx
│   │       │   └── [id]/edit/page.tsx
│   │       └── flows/
│   │           ├── page.tsx
│   │           └── [id]/edit/page.tsx
│   ├── start/page.tsx                    # 기존 유지
│   └── api/                              # 기존 유지
├── lib/
│   └── auth/
│       └── admin-auth.ts                 # JWT 생성/검증, 비밀번호 검증 (NEW)
├── components/
│   ├── user/                             # 사용자 웹 컴포넌트 (NEW)
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── LangSwitcher.tsx              # Client Component
│   │   ├── SpotCard.tsx
│   │   ├── EventCard.tsx
│   │   ├── CategoryFilter.tsx
│   │   ├── SearchInput.tsx               # Client Component
│   │   ├── Pagination.tsx
│   │   ├── MapEmbed.tsx
│   │   └── ImageGallery.tsx
│   └── admin/                            # Admin CMS 컴포넌트 (NEW)
│       ├── AdminSidebar.tsx
│       ├── AdminHeader.tsx
│       ├── DataTable.tsx
│       ├── LocalizedInput.tsx            # 다국어 탭 입력
│       ├── ConfirmDialog.tsx
│       ├── SpotForm.tsx
│       ├── EventForm.tsx
│       └── FlowEditor/
│           ├── StepList.tsx
│           ├── StepForm.tsx
│           └── OptionForm.tsx
└── actions/                              # Server Actions (NEW)
    ├── admin-auth.actions.ts             # 로그인/로그아웃
    ├── spot.actions.ts                   # CRUD
    ├── event.actions.ts                  # CRUD
    └── flow.actions.ts                   # CRUD
```

---

## 7. Data Access Patterns

### 7-1. User Web (Read-Only)

Server Component에서 Repository 직접 호출. API 라우트 불필요.

```typescript
// app/[lang]/spots/page.tsx
import { SpotRepository } from "@/services/tourism/spot.repository";
import { getDb } from "@/lib/db/client";

export default async function SpotsPage({ searchParams }: PageProps<"/[lang]/spots">) {
  const params = await searchParams;
  const db = getDb();
  const spotRepo = new SpotRepository(db);

  const spots = params.q
    ? await spotRepo.searchByName(params.q)
    : await spotRepo.searchByCategory(params.category ?? "");

  return <SpotListView spots={spots} />;
}
```

### 7-2. Admin CMS (Write)

Server Actions로 쓰기 처리. Zod validation + Drizzle ORM.

```typescript
// src/actions/spot.actions.ts
"use server";

import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { tourismSpots } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { verifyAdminSession } from "@/lib/auth/admin-auth";

const spotSchema = z.object({
  nameKo: z.string().min(1),
  names: z.record(z.string()),
  description: z.record(z.string()),
  // ... etc
});

export async function createSpot(formData: FormData) {
  await verifyAdminSession();
  const data = spotSchema.parse(Object.fromEntries(formData));

  const db = getDb();
  await db.insert(tourismSpots).values({ ...data, source: "curated" });
  revalidatePath("/admin/spots");
}
```

---

## 8. Admin Auth Implementation

### 8-1. Core Functions

```typescript
// src/lib/auth/admin-auth.ts

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const JWT_SECRET = new TextEncoder().encode(process.env.ADMIN_JWT_SECRET);
const COOKIE_NAME = "admin_token";

export async function createSession(admin: AdminUser): Promise<void>;
export async function verifyAdminSession(): Promise<AdminJwtPayload>;
export async function destroySession(): Promise<void>;
export async function verifyPassword(plain: string, hash: string): Promise<boolean>;
export async function hashPassword(plain: string): Promise<string>;
```

### 8-2. Dependencies (New)

```
jose          # JWT (Edge-compatible, no Node.js crypto dependency)
bcryptjs      # bcrypt for password hashing (pure JS, Vercel compatible)
```

---

## 9. Environment Variables (New)

```env
# Admin Auth
ADMIN_JWT_SECRET=              # JWT signing secret (random 256-bit string)
```

---

## 10. Invariants (Must Not Change)

- 기존 봇 webhook 라우트 (`/api/webhooks/*`) 동작 유지
- 기존 `/start` 페이지 동작 유지
- `LocalizedText`, `localize()`, `Result<T>` 타입 변경 없음
- `SpotRepository`, `EventRepository` 기존 메서드 시그니처 유지
- DB 스키마 변경 없음 (새 마이그레이션 불필요)

---

## 11. Non-Goals (Out of Scope)

- 사용자 웹에서의 실시간 검색 (auto-complete, debounce 검색은 MVP 이후)
- 이미지 파일 업로드 (URL 입력만)
- Admin 대시보드의 분석/통계 차트 (TODO[MVP]: 간단한 카운트만)
- Admin 대화로그 뷰어
- Admin 광고 관리
- Admin 사용자(관리자 계정) 관리 UI
- 지도 인터랙티브 표시 (정적 이미지 또는 간단한 embed만)
- 플로우 에디터의 드래그 앤 드롭 UI (수동 순서 입력으로 대체)
- 사용자 웹의 예약 기능 (봇으로 안내)

---

## 12. Testing Strategy

- Admin auth: `admin-auth.ts` 함수별 단위 테스트 (JWT 생성/검증, 비밀번호)
- Server Actions: Zod 스키마 검증 테스트
- 사용자 웹 페이지: 빌드 성공 검증 (`npm run build`)
- 기존 테스트: 모두 통과 유지

---

## 13. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| shadcn/ui 설치가 Next.js 16과 호환 안 될 수 있음 | Admin CMS UI 지연 | 호환 확인 후 설치, 실패 시 Tailwind만으로 구현 |
| `proxy.ts` i18n 리다이렉트가 기존 webhook에 영향 | 봇 서비스 장애 | matcher에서 `/api/` 명시적 제외, 테스트 검증 |
| Server Component에서 Repository 인스턴스화 패턴 | DB 연결 관리 | 기존 `getDb()` singleton 패턴 활용 |
| JWT 쿠키가 서버리스 환경에서 제대로 동작 안 할 수 있음 | Admin 로그인 실패 | `jose` 라이브러리 사용 (Edge-compatible) |
