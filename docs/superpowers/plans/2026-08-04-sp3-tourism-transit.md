# SP3: Tourism & Transit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement tourism spot search, transit route finding, event discovery, taxi deep links, and embedding-based location search behind Provider interfaces with mock-first development.

**Architecture:** Port-Adapter pattern — services depend on Provider interfaces, not concrete API clients. ActionRegistry bridges FlowEngine's `apiAction` dispatch to service methods. LocationResolver gains Stage 2 embedding similarity search. Mock providers ship first; real API adapters swap in when keys are provisioned.

**Tech Stack:** Next.js 15, TypeScript strict, Drizzle ORM, Neon Serverless Postgres, pgvector, Vitest

## Global Constraints

- TypeScript strict mode — no `any` type
- All external API calls wrapped in try/catch, return empty results on failure (never crash)
- All user-facing text uses `LocalizedText` with `localize()` from `src/types/common.ts` — support en/ko/ja/zh
- Use `@/` path alias for imports from `src/`
- Test command: `npx vitest run`
- Single test file: `npx vitest run src/path/to/file.test.ts`
- Conventional commits: `feat:`, `test:`, `refactor:`
- Provider interfaces must be pure — no concrete API dependencies
- Mock providers return hardcoded Busan data, no network calls
- `Database` type imported from `@/lib/db/client`
- `OutgoingMessage`, `MessageButton` imported from `@/services/bot/types`
- `LocalizedText`, `localize`, `LatLng` from `@/types/common`

---

### Task 1: Shared Types + Environment Variables

**Files:**
- Modify: `src/types/common.ts`
- Modify: `src/lib/env.ts`
- Modify: `src/lib/env.test.ts`

**Interfaces:**
- Consumes: nothing new
- Produces: `LatLng` interface (used by Tasks 2, 5, 6, 7, 8); new env vars `GOOGLE_MAPS_API_KEY`, `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`, `TAGO_API_KEY`, `TOUR_API_KEY`, `GOOGLE_PLACES_API_KEY`

- [ ] **Step 1: Write test for LatLng type**

Add to `src/types/common.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import type { LatLng } from "./common";

describe("LatLng", () => {
  it("satisfies the LatLng interface", () => {
    const point: LatLng = { latitude: 35.1586, longitude: 129.1604 };
    expect(point.latitude).toBe(35.1586);
    expect(point.longitude).toBe(129.1604);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/types/common.test.ts`
Expected: FAIL — `LatLng` is not exported from `./common`

- [ ] **Step 3: Add LatLng to common.ts**

Add to the end of `src/types/common.ts`:

```typescript
export interface LatLng {
  latitude: number;
  longitude: number;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/types/common.test.ts`
Expected: PASS

- [ ] **Step 5: Add new env vars to env.ts**

Add these fields to the `envSchema` object in `src/lib/env.ts`, after the existing `LINE_CHANNEL_SECRET` entry:

```typescript
// Transit APIs
GOOGLE_MAPS_API_KEY: z.string().default(""),
NAVER_CLIENT_ID: z.string().default(""),
NAVER_CLIENT_SECRET: z.string().default(""),
TAGO_API_KEY: z.string().default(""),

// Tourism APIs
TOUR_API_KEY: z.string().default(""),
GOOGLE_PLACES_API_KEY: z.string().default(""),
```

- [ ] **Step 6: Update env test**

Add a test to `src/lib/env.test.ts`:

```typescript
it("includes SP3 API key fields with empty defaults", () => {
  const env = getEnv();
  expect(env.GOOGLE_MAPS_API_KEY).toBe("");
  expect(env.NAVER_CLIENT_ID).toBe("");
  expect(env.NAVER_CLIENT_SECRET).toBe("");
  expect(env.TAGO_API_KEY).toBe("");
  expect(env.TOUR_API_KEY).toBe("");
  expect(env.GOOGLE_PLACES_API_KEY).toBe("");
});
```

- [ ] **Step 7: Run all tests**

Run: `npx vitest run`
Expected: ALL PASS

- [ ] **Step 8: Commit**

```bash
git add src/types/common.ts src/types/common.test.ts src/lib/env.ts src/lib/env.test.ts
git commit -m "feat: add LatLng type and SP3 environment variables"
```

---

### Task 2: Transit Provider Interface + Mock

**Files:**
- Create: `src/lib/external/transit/types.ts`
- Create: `src/lib/external/transit/mock.provider.ts`
- Create: `src/lib/external/transit/mock.provider.test.ts`

**Interfaces:**
- Consumes: `LatLng` from `@/types/common`, `LocalizedText` from `@/types/common`
- Produces: `TransitProvider` interface, `TransitRoute`, `TransitStep` types, `MockTransitProvider` class (used by Tasks 7, 10)

- [ ] **Step 1: Create transit types**

Create `src/lib/external/transit/types.ts`:

```typescript
import type { LocalizedText, LatLng } from "@/types/common";

export interface TransitStep {
  mode: "walk" | "bus" | "metro" | "train";
  instruction: LocalizedText;
  duration: number;   // minutes
  distance: number;   // meters
  line?: string;
  stops?: number;
  departureStop?: string;
  arrivalStop?: string;
}

export interface TransitRoute {
  summary: string;
  duration: number;   // total minutes
  distance: number;   // total meters
  fare: number;       // KRW
  steps: TransitStep[];
  departureTime: Date;
  arrivalTime: Date;
}

export interface TransitProvider {
  searchRoutes(
    from: LatLng,
    to: LatLng,
    options?: { departureTime?: Date; language?: string },
  ): Promise<TransitRoute[]>;
}
```

- [ ] **Step 2: Write mock provider test**

Create `src/lib/external/transit/mock.provider.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { MockTransitProvider } from "./mock.provider";
import type { LatLng } from "@/types/common";

describe("MockTransitProvider", () => {
  const provider = new MockTransitProvider();

  it("returns routes for any coordinate pair", async () => {
    const from: LatLng = { latitude: 35.1586, longitude: 129.1604 };
    const to: LatLng = { latitude: 35.0975, longitude: 129.0088 };
    const routes = await provider.searchRoutes(from, to);

    expect(routes.length).toBeGreaterThan(0);
    expect(routes[0]!.summary).toBeTruthy();
    expect(routes[0]!.duration).toBeGreaterThan(0);
    expect(routes[0]!.steps.length).toBeGreaterThan(0);
    expect(routes[0]!.fare).toBeGreaterThan(0);
  });

  it("each step has required fields", async () => {
    const from: LatLng = { latitude: 35.1586, longitude: 129.1604 };
    const to: LatLng = { latitude: 35.0975, longitude: 129.0088 };
    const routes = await provider.searchRoutes(from, to);
    const step = routes[0]!.steps[0]!;

    expect(["walk", "bus", "metro", "train"]).toContain(step.mode);
    expect(step.instruction.en).toBeTruthy();
    expect(step.instruction.ko).toBeTruthy();
    expect(step.duration).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/lib/external/transit/mock.provider.test.ts`
Expected: FAIL — `mock.provider` module not found

- [ ] **Step 4: Implement mock provider**

Create `src/lib/external/transit/mock.provider.ts`:

```typescript
import type { LatLng } from "@/types/common";
import type { TransitProvider, TransitRoute } from "./types";

const MOCK_ROUTES: TransitRoute[] = [
  {
    summary: "Bus 1003 → Metro Line 1",
    duration: 55,
    distance: 18200,
    fare: 2650,
    steps: [
      {
        mode: "walk",
        instruction: { en: "Walk to Haeundae Station Bus Stop", ko: "해운대역 버스정류장까지 도보" },
        duration: 5,
        distance: 300,
      },
      {
        mode: "bus",
        instruction: { en: "Take Bus 1003 to Toseong Station", ko: "1003번 버스 토성역 하차" },
        duration: 35,
        distance: 14000,
        line: "1003",
        stops: 18,
        departureStop: "Haeundae Station",
        arrivalStop: "Toseong Station",
      },
      {
        mode: "walk",
        instruction: { en: "Walk to Gamcheon Culture Village", ko: "감천문화마을까지 도보" },
        duration: 15,
        distance: 900,
      },
    ],
    departureTime: new Date(),
    arrivalTime: new Date(Date.now() + 55 * 60 * 1000),
  },
  {
    summary: "Metro Line 2 → Bus 17",
    duration: 65,
    distance: 20100,
    fare: 2900,
    steps: [
      {
        mode: "walk",
        instruction: { en: "Walk to Haeundae Metro Station", ko: "해운대 지하철역까지 도보" },
        duration: 3,
        distance: 200,
      },
      {
        mode: "metro",
        instruction: { en: "Take Line 2 to Seomyeon, transfer to Line 1 to Toseong", ko: "2호선 서면역 환승, 1호선 토성역 하차" },
        duration: 40,
        distance: 16000,
        line: "Line 2 → Line 1",
        stops: 14,
        departureStop: "Haeundae",
        arrivalStop: "Toseong",
      },
      {
        mode: "walk",
        instruction: { en: "Walk to Gamcheon Culture Village", ko: "감천문화마을까지 도보" },
        duration: 15,
        distance: 900,
      },
    ],
    departureTime: new Date(),
    arrivalTime: new Date(Date.now() + 65 * 60 * 1000),
  },
];

export class MockTransitProvider implements TransitProvider {
  async searchRoutes(
    _from: LatLng,
    _to: LatLng,
    _options?: { departureTime?: Date; language?: string },
  ): Promise<TransitRoute[]> {
    return MOCK_ROUTES.map((route) => ({
      ...route,
      departureTime: new Date(),
      arrivalTime: new Date(Date.now() + route.duration * 60 * 1000),
    }));
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/lib/external/transit/mock.provider.test.ts`
Expected: PASS

- [ ] **Step 6: Run all tests**

Run: `npx vitest run`
Expected: ALL PASS

- [ ] **Step 7: Commit**

```bash
git add src/lib/external/transit/
git commit -m "feat: add TransitProvider interface and mock implementation"
```

---

### Task 3: Tourism Provider Interface + Mock

**Files:**
- Create: `src/lib/external/tourism/types.ts`
- Create: `src/lib/external/tourism/mock.provider.ts`
- Create: `src/lib/external/tourism/mock.provider.test.ts`

**Interfaces:**
- Consumes: `LocalizedText` from `@/types/common`
- Produces: `TourismProvider` interface, `TourismSpotExternal` type, `MockTourismProvider` class (used by Tasks 8, 10)

- [ ] **Step 1: Create tourism types**

Create `src/lib/external/tourism/types.ts`:

```typescript
import type { LocalizedText } from "@/types/common";

export interface TourismSpotExternal {
  externalId: string;
  names: LocalizedText;
  description: LocalizedText;
  address: LocalizedText;
  latitude: number;
  longitude: number;
  category: string;
  rating?: number;
  images: string[];
  openingHours?: Record<string, string>;
  phone?: string;
  website?: string;
}

export interface TourismProvider {
  searchSpots(
    query: string,
    options?: { category?: string; limit?: number; language?: string },
  ): Promise<TourismSpotExternal[]>;
  getSpotDetail(externalId: string): Promise<TourismSpotExternal | null>;
}
```

- [ ] **Step 2: Write mock provider test**

Create `src/lib/external/tourism/mock.provider.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { MockTourismProvider } from "./mock.provider";

describe("MockTourismProvider", () => {
  const provider = new MockTourismProvider();

  it("returns spots matching query", async () => {
    const spots = await provider.searchSpots("beach");
    expect(spots.length).toBeGreaterThan(0);
    const hasBeach = spots.some(
      (s) => s.names.en?.toLowerCase().includes("beach") || s.category === "beach",
    );
    expect(hasBeach).toBe(true);
  });

  it("returns all spots for empty query", async () => {
    const spots = await provider.searchSpots("");
    expect(spots.length).toBe(5);
  });

  it("respects limit option", async () => {
    const spots = await provider.searchSpots("", { limit: 2 });
    expect(spots.length).toBe(2);
  });

  it("getSpotDetail returns a spot by externalId", async () => {
    const spots = await provider.searchSpots("");
    const detail = await provider.getSpotDetail(spots[0]!.externalId);
    expect(detail).not.toBeNull();
    expect(detail!.externalId).toBe(spots[0]!.externalId);
  });

  it("getSpotDetail returns null for unknown id", async () => {
    const detail = await provider.getSpotDetail("nonexistent");
    expect(detail).toBeNull();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/lib/external/tourism/mock.provider.test.ts`
Expected: FAIL — module not found

- [ ] **Step 4: Implement mock provider**

Create `src/lib/external/tourism/mock.provider.ts`:

```typescript
import type { TourismProvider, TourismSpotExternal } from "./types";

const MOCK_SPOTS: TourismSpotExternal[] = [
  {
    externalId: "mock-haeundae",
    names: { en: "Haeundae Beach", ko: "해운대해수욕장", ja: "海雲台ビーチ", zh: "海云台海水浴场" },
    description: {
      en: "Busan's most famous beach with white sand and beautiful coastline.",
      ko: "부산에서 가장 유명한 해수욕장으로 하얀 모래와 아름다운 해안선이 특징입니다.",
    },
    address: { en: "264 Haeundaehaebyeon-ro, Haeundae-gu, Busan", ko: "부산 해운대구 해운대해변로 264" },
    latitude: 35.1586,
    longitude: 129.1604,
    category: "beach",
    rating: 4.5,
    images: ["https://example.com/haeundae.jpg"],
  },
  {
    externalId: "mock-gamcheon",
    names: { en: "Gamcheon Culture Village", ko: "감천문화마을", ja: "甘川文化村", zh: "甘川文化村" },
    description: {
      en: "Colorful hillside village known as the 'Machu Picchu of Busan'.",
      ko: "부산의 마추픽추로 불리는 알록달록한 언덕 마을입니다.",
    },
    address: { en: "203 Gamnae 2-ro, Saha-gu, Busan", ko: "부산 사하구 감내2로 203" },
    latitude: 35.0975,
    longitude: 129.0088,
    category: "landmark",
    rating: 4.3,
    images: ["https://example.com/gamcheon.jpg"],
  },
  {
    externalId: "mock-jagalchi",
    names: { en: "Jagalchi Market", ko: "자갈치시장", ja: "チャガルチ市場", zh: "札嘎其市场" },
    description: {
      en: "Korea's largest seafood market, famous for fresh fish and local cuisine.",
      ko: "한국 최대의 수산시장으로 신선한 해산물과 지역 음식으로 유명합니다.",
    },
    address: { en: "52 Jagalchihaean-ro, Jung-gu, Busan", ko: "부산 중구 자갈치해안로 52" },
    latitude: 35.0968,
    longitude: 129.0306,
    category: "market",
    rating: 4.2,
    images: ["https://example.com/jagalchi.jpg"],
  },
  {
    externalId: "mock-yonggungsa",
    names: { en: "Haedong Yonggungsa Temple", ko: "해동용궁사", ja: "海東龍宮寺", zh: "海东龙宫寺" },
    description: {
      en: "Stunning seaside Buddhist temple perched on the cliffs of Busan's coast.",
      ko: "부산 해안 절벽 위에 자리한 아름다운 해안 사찰입니다.",
    },
    address: { en: "86 Yonggung-gil, Gijang-gun, Busan", ko: "부산 기장군 용궁길 86" },
    latitude: 35.1884,
    longitude: 129.2233,
    category: "temple",
    rating: 4.6,
    images: ["https://example.com/yonggungsa.jpg"],
  },
  {
    externalId: "mock-biff",
    names: { en: "BIFF Square", ko: "BIFF 광장", ja: "BIFF広場", zh: "BIFF广场" },
    description: {
      en: "Iconic street named after Busan International Film Festival, famous for street food.",
      ko: "부산국제영화제의 이름을 딴 거리로 길거리 음식으로 유명합니다.",
    },
    address: { en: "BIFF Square, Nampo-dong, Jung-gu, Busan", ko: "부산 중구 남포동 BIFF광장" },
    latitude: 35.0991,
    longitude: 129.0280,
    category: "entertainment",
    rating: 4.0,
    images: ["https://example.com/biff.jpg"],
  },
];

export class MockTourismProvider implements TourismProvider {
  async searchSpots(
    query: string,
    options?: { category?: string; limit?: number; language?: string },
  ): Promise<TourismSpotExternal[]> {
    let results = [...MOCK_SPOTS];

    if (query) {
      const q = query.toLowerCase();
      results = results.filter(
        (s) =>
          Object.values(s.names).some((n) => n.toLowerCase().includes(q)) ||
          s.category.toLowerCase().includes(q),
      );
    }

    if (options?.category) {
      results = results.filter((s) => s.category === options.category);
    }

    if (options?.limit) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  async getSpotDetail(externalId: string): Promise<TourismSpotExternal | null> {
    return MOCK_SPOTS.find((s) => s.externalId === externalId) ?? null;
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/lib/external/tourism/mock.provider.test.ts`
Expected: PASS

- [ ] **Step 6: Run all tests**

Run: `npx vitest run`
Expected: ALL PASS

- [ ] **Step 7: Commit**

```bash
git add src/lib/external/tourism/
git commit -m "feat: add TourismProvider interface and mock implementation"
```

---

### Task 4: Realtime + Embedding Provider Interfaces + Mocks

**Files:**
- Create: `src/lib/external/realtime/types.ts`
- Create: `src/lib/external/realtime/mock.provider.ts`
- Create: `src/lib/external/realtime/mock.provider.test.ts`
- Create: `src/lib/external/embedding/types.ts`
- Create: `src/lib/external/embedding/mock.provider.ts`
- Create: `src/lib/external/embedding/mock.provider.test.ts`

**Interfaces:**
- Consumes: nothing new
- Produces: `RealtimeProvider`, `RealtimeArrival`, `MockRealtimeProvider` (future use); `EmbeddingProvider`, `MockEmbeddingProvider` (used by Task 9)

- [ ] **Step 1: Create realtime types**

Create `src/lib/external/realtime/types.ts`:

```typescript
export interface RealtimeArrival {
  line: string;
  destination: string;
  arrivalMinutes: number;
  vehicleId?: string;
}

export interface RealtimeProvider {
  getArrivals(stopId: string): Promise<RealtimeArrival[]>;
}
```

- [ ] **Step 2: Write realtime mock test**

Create `src/lib/external/realtime/mock.provider.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { MockRealtimeProvider } from "./mock.provider";

describe("MockRealtimeProvider", () => {
  const provider = new MockRealtimeProvider();

  it("returns arrivals for any stop ID", async () => {
    const arrivals = await provider.getArrivals("stop-1");
    expect(arrivals.length).toBeGreaterThan(0);
    expect(arrivals[0]!.line).toBeTruthy();
    expect(arrivals[0]!.arrivalMinutes).toBeGreaterThanOrEqual(0);
  });

  it("each arrival has required fields", async () => {
    const arrivals = await provider.getArrivals("stop-1");
    for (const arrival of arrivals) {
      expect(arrival.line).toBeTruthy();
      expect(arrival.destination).toBeTruthy();
      expect(typeof arrival.arrivalMinutes).toBe("number");
    }
  });
});
```

- [ ] **Step 3: Implement realtime mock**

Create `src/lib/external/realtime/mock.provider.ts`:

```typescript
import type { RealtimeProvider, RealtimeArrival } from "./types";

const MOCK_ARRIVALS: RealtimeArrival[] = [
  { line: "1003", destination: "Haeundae", arrivalMinutes: 3, vehicleId: "bus-1003-a" },
  { line: "1003", destination: "Haeundae", arrivalMinutes: 8, vehicleId: "bus-1003-b" },
  { line: "1003", destination: "Haeundae", arrivalMinutes: 15, vehicleId: "bus-1003-c" },
  { line: "Line 1", destination: "Nopo", arrivalMinutes: 2, vehicleId: "metro-1-a" },
  { line: "Line 1", destination: "Sinpyeong", arrivalMinutes: 6, vehicleId: "metro-1-b" },
];

export class MockRealtimeProvider implements RealtimeProvider {
  async getArrivals(_stopId: string): Promise<RealtimeArrival[]> {
    return [...MOCK_ARRIVALS];
  }
}
```

- [ ] **Step 4: Create embedding types**

Create `src/lib/external/embedding/types.ts`:

```typescript
export interface EmbeddingProvider {
  embed(texts: string[]): Promise<number[][]>;
  readonly dimensions: number;
}
```

- [ ] **Step 5: Write embedding mock test**

Create `src/lib/external/embedding/mock.provider.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { MockEmbeddingProvider } from "./mock.provider";

describe("MockEmbeddingProvider", () => {
  const provider = new MockEmbeddingProvider();

  it("returns zero vectors for input texts", async () => {
    const result = await provider.embed(["hello", "world"]);
    expect(result.length).toBe(2);
    expect(result[0]!.length).toBe(provider.dimensions);
    expect(result[0]!.every((v) => v === 0)).toBe(true);
  });

  it("has dimensions property set to 1024", () => {
    expect(provider.dimensions).toBe(1024);
  });

  it("handles empty input", async () => {
    const result = await provider.embed([]);
    expect(result).toEqual([]);
  });
});
```

- [ ] **Step 6: Implement embedding mock**

Create `src/lib/external/embedding/mock.provider.ts`:

```typescript
import type { EmbeddingProvider } from "./types";

export class MockEmbeddingProvider implements EmbeddingProvider {
  readonly dimensions = 1024;

  async embed(texts: string[]): Promise<number[][]> {
    return texts.map(() => new Array(this.dimensions).fill(0));
  }
}
```

- [ ] **Step 7: Run all new tests**

Run: `npx vitest run src/lib/external/realtime/ src/lib/external/embedding/`
Expected: ALL PASS

- [ ] **Step 8: Run full suite**

Run: `npx vitest run`
Expected: ALL PASS

- [ ] **Step 9: Commit**

```bash
git add src/lib/external/realtime/ src/lib/external/embedding/
git commit -m "feat: add Realtime and Embedding provider interfaces with mocks"
```

---

### Task 5: SpotRepository + EventRepository

**Files:**
- Create: `src/services/tourism/spot.repository.ts`
- Create: `src/services/tourism/spot.repository.test.ts`
- Create: `src/services/tourism/event.repository.ts`
- Create: `src/services/tourism/event.repository.test.ts`
- Create: `src/services/tourism/types.ts`

**Interfaces:**
- Consumes: `Database` from `@/lib/db/client`, `tourismSpots`, `events`, `locationAliases` from `@/lib/db/schema`, `TourismSpotExternal` from `@/lib/external/tourism/types`
- Produces: `SpotRepository` with methods `searchByName(query, limit?)`, `searchByCategory(category, limit?)`, `getById(id)`, `searchBySimilarity(embedding, threshold?, limit?)`, `upsertFromExternal(spot, source)` — returns `SpotRecord`; `EventRepository` with methods `getActiveEvents(options?)`, `getById(id)` — returns `EventRecord`; `SpotRecord` and `EventRecord` types (used by Tasks 8, 9, 10)

- [ ] **Step 1: Create tourism types**

Create `src/services/tourism/types.ts`:

```typescript
import type { LocalizedText } from "@/types/common";

export interface SpotRecord {
  id: string;
  nameKo: string;
  names: LocalizedText;
  description: LocalizedText;
  addressKo: string | null;
  addresses: LocalizedText;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  website: string | null;
  images: string[];
  rating: number | null;
  source: string;
  isActive: boolean;
}

export interface EventRecord {
  id: string;
  nameKo: string;
  names: LocalizedText;
  description: LocalizedText;
  category: string;
  venueName: LocalizedText;
  addressKo: string | null;
  latitude: number | null;
  longitude: number | null;
  startsAt: Date;
  endsAt: Date;
  priceInfo: LocalizedText;
  bookingUrl: string | null;
  images: string[];
  source: string;
  isActive: boolean;
}
```

- [ ] **Step 2: Write SpotRepository test**

Create `src/services/tourism/spot.repository.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { SpotRepository } from "./spot.repository";
import type { Database } from "@/lib/db/client";

function createMockDb(results: unknown[] = []): Database {
  const chain = {
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(results),
    orderBy: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
  };

  return {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue(chain),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockResolvedValue([{ id: "spot-1" }]),
        onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
        returning: vi.fn().mockResolvedValue([{
          id: "spot-1", nameKo: "해운대해수욕장",
          names: { en: "Haeundae Beach" }, description: {},
          addressKo: null, addresses: {},
          latitude: 35.1586, longitude: 129.1604,
          phone: null, website: null,
          images: [], rating: null,
          source: "tour_api", isActive: true,
        }]),
      }),
    }),
    execute: vi.fn().mockResolvedValue([]),
  } as unknown as Database;
}

describe("SpotRepository", () => {
  it("searchByName queries DB with ilike pattern", async () => {
    const mockSpot = {
      id: "spot-1", nameKo: "해운대해수욕장",
      names: { en: "Haeundae Beach" }, description: {},
      addressKo: null, addresses: {},
      latitude: 35.1586, longitude: 129.1604,
      phone: null, website: null,
      images: [], rating: null,
      source: "manual", isActive: true,
    };
    const db = createMockDb([mockSpot]);
    const repo = new SpotRepository(db);

    const results = await repo.searchByName("haeundae");
    expect(results.length).toBe(1);
    expect(results[0]!.nameKo).toBe("해운대해수욕장");
  });

  it("getById returns a spot or null", async () => {
    const db = createMockDb([]);
    const repo = new SpotRepository(db);

    const result = await repo.getById("nonexistent");
    expect(result).toBeNull();
  });

  it("upsertFromExternal creates a spot record", async () => {
    const db = createMockDb();
    const repo = new SpotRepository(db);

    const external = {
      externalId: "ext-1",
      names: { en: "Test Spot" },
      description: { en: "A test" },
      address: { en: "123 Street" },
      latitude: 35.0,
      longitude: 129.0,
      category: "landmark",
      images: [],
    };

    const result = await repo.upsertFromExternal(external, "tour_api");
    expect(result).not.toBeNull();
    expect(result.id).toBe("spot-1");
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/services/tourism/spot.repository.test.ts`
Expected: FAIL — module not found

- [ ] **Step 4: Implement SpotRepository**

Create `src/services/tourism/spot.repository.ts`:

```typescript
import { eq, ilike, or, sql } from "drizzle-orm";
import type { Database } from "@/lib/db/client";
import { tourismSpots } from "@/lib/db/schema";
import type { TourismSpotExternal } from "@/lib/external/tourism/types";
import type { SpotRecord } from "./types";
import type { LocalizedText } from "@/types/common";

export class SpotRepository {
  constructor(private db: Database) {}

  async searchByName(query: string, limit = 10): Promise<SpotRecord[]> {
    try {
      const pattern = `%${query}%`;
      const rows = await this.db
        .select()
        .from(tourismSpots)
        .where(
          or(
            ilike(tourismSpots.nameKo, pattern),
            sql`${tourismSpots.names}::text ILIKE ${pattern}`,
          ),
        )
        .limit(limit);

      return rows.map(this.toSpotRecord);
    } catch {
      return [];
    }
  }

  async searchByCategory(category: string, limit = 10): Promise<SpotRecord[]> {
    try {
      const rows = await this.db
        .select()
        .from(tourismSpots)
        .where(eq(tourismSpots.isActive, true))
        .limit(limit);

      // Filter by category from tags JSONB
      return rows
        .filter((r) => {
          const tags = (r.tags ?? []) as string[];
          return tags.includes(category);
        })
        .map(this.toSpotRecord);
    } catch {
      return [];
    }
  }

  async getById(id: string): Promise<SpotRecord | null> {
    try {
      const rows = await this.db
        .select()
        .from(tourismSpots)
        .where(eq(tourismSpots.id, id))
        .limit(1);

      if (rows.length === 0 || !rows[0]) return null;
      return this.toSpotRecord(rows[0]);
    } catch {
      return null;
    }
  }

  async searchBySimilarity(
    embedding: number[],
    threshold = 0.8,
    limit = 3,
  ): Promise<(SpotRecord & { similarity: number })[]> {
    try {
      const vectorStr = `[${embedding.join(",")}]`;
      const rows = await this.db.execute(sql`
        SELECT *, 1 - (embedding <=> ${vectorStr}::vector) as similarity
        FROM tourism_spots
        WHERE is_active = true
          AND embedding IS NOT NULL
          AND 1 - (embedding <=> ${vectorStr}::vector) >= ${threshold}
        ORDER BY embedding <=> ${vectorStr}::vector
        LIMIT ${limit}
      `);

      return (rows.rows as unknown[]).map((row: unknown) => {
        const r = row as Record<string, unknown>;
        return {
          ...this.toSpotRecordFromRaw(r),
          similarity: Number(r.similarity),
        };
      });
    } catch {
      return [];
    }
  }

  async upsertFromExternal(
    spot: TourismSpotExternal,
    source: string,
  ): Promise<SpotRecord> {
    const nameKo = spot.names.ko ?? spot.names.en ?? Object.values(spot.names)[0] ?? "";
    const addressKo = spot.address.ko ?? spot.address.en ?? null;

    const rows = await this.db
      .insert(tourismSpots)
      .values({
        googlePlaceId: spot.externalId,
        nameKo,
        names: spot.names as Record<string, unknown>,
        description: spot.description as Record<string, unknown>,
        addressKo,
        addresses: spot.address as Record<string, unknown>,
        latitude: spot.latitude.toString(),
        longitude: spot.longitude.toString(),
        phone: spot.phone ?? null,
        website: spot.website ?? null,
        images: spot.images as unknown[],
        rating: spot.rating?.toString() ?? null,
        source,
        isActive: true,
      })
      .returning();

    return this.toSpotRecord(rows[0]!);
  }

  private toSpotRecord(row: typeof tourismSpots.$inferSelect): SpotRecord {
    return {
      id: row.id,
      nameKo: row.nameKo,
      names: (row.names ?? {}) as LocalizedText,
      description: (row.description ?? {}) as LocalizedText,
      addressKo: row.addressKo,
      addresses: (row.addresses ?? {}) as LocalizedText,
      latitude: row.latitude ? Number(row.latitude) : null,
      longitude: row.longitude ? Number(row.longitude) : null,
      phone: row.phone,
      website: row.website,
      images: (row.images ?? []) as string[],
      rating: row.rating ? Number(row.rating) : null,
      source: row.source,
      isActive: row.isActive,
    };
  }

  private toSpotRecordFromRaw(row: Record<string, unknown>): SpotRecord {
    return {
      id: row.id as string,
      nameKo: row.name_ko as string,
      names: (row.names ?? {}) as LocalizedText,
      description: (row.description ?? {}) as LocalizedText,
      addressKo: (row.address_ko as string) ?? null,
      addresses: (row.addresses ?? {}) as LocalizedText,
      latitude: row.latitude ? Number(row.latitude) : null,
      longitude: row.longitude ? Number(row.longitude) : null,
      phone: (row.phone as string) ?? null,
      website: (row.website as string) ?? null,
      images: (row.images ?? []) as string[],
      rating: row.rating ? Number(row.rating) : null,
      source: row.source as string,
      isActive: Boolean(row.is_active),
    };
  }
}
```

- [ ] **Step 5: Run SpotRepository test**

Run: `npx vitest run src/services/tourism/spot.repository.test.ts`
Expected: PASS

- [ ] **Step 6: Write EventRepository test**

Create `src/services/tourism/event.repository.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { EventRepository } from "./event.repository";
import type { Database } from "@/lib/db/client";

function createMockDb(results: unknown[] = []): Database {
  const chain = {
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(results),
    orderBy: vi.fn().mockReturnThis(),
  };

  return {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue(chain),
    }),
  } as unknown as Database;
}

describe("EventRepository", () => {
  it("getActiveEvents returns events from DB", async () => {
    const mockEvent = {
      id: "event-1",
      nameKo: "부산국제영화제",
      names: { en: "Busan International Film Festival" },
      description: { en: "Annual film festival" },
      category: "festival",
      venueName: { en: "Busan Cinema Center" },
      addressKo: "부산시 해운대구",
      addresses: {},
      latitude: "35.1586",
      longitude: "129.1604",
      startsAt: new Date("2026-10-01"),
      endsAt: new Date("2026-10-10"),
      priceInfo: { en: "Free" },
      bookingUrl: "https://biff.kr",
      images: [],
      source: "manual",
      isActive: true,
    };
    const db = createMockDb([mockEvent]);
    const repo = new EventRepository(db);

    const results = await repo.getActiveEvents();
    expect(results.length).toBe(1);
    expect(results[0]!.nameKo).toBe("부산국제영화제");
  });

  it("getById returns null for missing event", async () => {
    const db = createMockDb([]);
    const repo = new EventRepository(db);

    const result = await repo.getById("nonexistent");
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 7: Implement EventRepository**

Create `src/services/tourism/event.repository.ts`:

```typescript
import { eq, and, gte, lte, sql } from "drizzle-orm";
import type { Database } from "@/lib/db/client";
import { events } from "@/lib/db/schema";
import type { EventRecord } from "./types";
import type { LocalizedText } from "@/types/common";

export class EventRepository {
  constructor(private db: Database) {}

  async getActiveEvents(
    options?: { date?: Date; category?: string; limit?: number },
  ): Promise<EventRecord[]> {
    try {
      const conditions = [eq(events.isActive, true)];

      if (options?.date) {
        conditions.push(lte(events.startsAt, options.date));
        conditions.push(gte(events.endsAt, options.date));
      }

      if (options?.category) {
        conditions.push(eq(events.category, options.category));
      }

      const rows = await this.db
        .select()
        .from(events)
        .where(and(...conditions))
        .orderBy(events.startsAt)
        .limit(options?.limit ?? 10);

      return rows.map(this.toEventRecord);
    } catch {
      return [];
    }
  }

  async getById(id: string): Promise<EventRecord | null> {
    try {
      const rows = await this.db
        .select()
        .from(events)
        .where(eq(events.id, id))
        .limit(1);

      if (rows.length === 0 || !rows[0]) return null;
      return this.toEventRecord(rows[0]);
    } catch {
      return null;
    }
  }

  private toEventRecord(row: typeof events.$inferSelect): EventRecord {
    return {
      id: row.id,
      nameKo: row.nameKo,
      names: (row.names ?? {}) as LocalizedText,
      description: (row.description ?? {}) as LocalizedText,
      category: row.category,
      venueName: (row.venueName ?? {}) as LocalizedText,
      addressKo: row.addressKo,
      latitude: row.latitude ? Number(row.latitude) : null,
      longitude: row.longitude ? Number(row.longitude) : null,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      priceInfo: (row.priceInfo ?? {}) as LocalizedText,
      bookingUrl: row.bookingUrl,
      images: (row.images ?? []) as string[],
      source: row.source,
      isActive: row.isActive,
    };
  }
}
```

- [ ] **Step 8: Run all new tests**

Run: `npx vitest run src/services/tourism/`
Expected: ALL PASS

- [ ] **Step 9: Run full suite**

Run: `npx vitest run`
Expected: ALL PASS

- [ ] **Step 10: Commit**

```bash
git add src/services/tourism/
git commit -m "feat: add SpotRepository, EventRepository, and tourism types"
```

---

### Task 6: TaxiService

**Files:**
- Create: `src/services/transit/types.ts`
- Create: `src/services/transit/taxi.service.ts`
- Create: `src/services/transit/taxi.service.test.ts`

**Interfaces:**
- Consumes: `LatLng` from `@/types/common`, `OutgoingMessage`, `MessageButton` from `@/services/bot/types`
- Produces: `TaxiService.generateDeepLinks(from, to, language): OutgoingMessage` (used by Tasks 7, 10)

- [ ] **Step 1: Create transit service types**

Create `src/services/transit/types.ts`:

```typescript
// Transit service types — service-layer types distinct from provider types
// Currently empty; add service-specific types here as needed.
```

- [ ] **Step 2: Write TaxiService test**

Create `src/services/transit/taxi.service.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { TaxiService } from "./taxi.service";
import type { LatLng } from "@/types/common";

describe("TaxiService", () => {
  const service = new TaxiService();

  it("generates deep links with correct coordinates", () => {
    const from: LatLng = { latitude: 35.1586, longitude: 129.1604 };
    const to: LatLng = { latitude: 35.0975, longitude: 129.0088 };

    const msg = service.generateDeepLinks(from, to, "en");

    expect(msg.type).toBe("buttons");
    expect(msg.text).toBeTruthy();
    expect(msg.buttons).toBeDefined();
    expect(msg.buttons!.length).toBe(2);
  });

  it("KakaoT link contains destination coordinates", () => {
    const from: LatLng = { latitude: 35.1586, longitude: 129.1604 };
    const to: LatLng = { latitude: 35.0975, longitude: 129.0088 };

    const msg = service.generateDeepLinks(from, to, "en");
    const kakaoBtn = msg.buttons!.find((b) => b.label.includes("KakaoT"));

    expect(kakaoBtn).toBeDefined();
    expect(kakaoBtn!.id).toContain("35.0975");
    expect(kakaoBtn!.id).toContain("129.0088");
  });

  it("Uber link contains pickup and dropoff coordinates", () => {
    const from: LatLng = { latitude: 35.1586, longitude: 129.1604 };
    const to: LatLng = { latitude: 35.0975, longitude: 129.0088 };

    const msg = service.generateDeepLinks(from, to, "en");
    const uberBtn = msg.buttons!.find((b) => b.label.includes("Uber"));

    expect(uberBtn).toBeDefined();
    expect(uberBtn!.id).toContain("35.1586"); // pickup
    expect(uberBtn!.id).toContain("35.0975"); // dropoff
  });

  it("localizes text for Korean", () => {
    const from: LatLng = { latitude: 35.1586, longitude: 129.1604 };
    const to: LatLng = { latitude: 35.0975, longitude: 129.0088 };

    const msg = service.generateDeepLinks(from, to, "ko");
    expect(msg.text).toBeTruthy();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/services/transit/taxi.service.test.ts`
Expected: FAIL — module not found

- [ ] **Step 4: Implement TaxiService**

Create `src/services/transit/taxi.service.ts`:

```typescript
import type { LatLng } from "@/types/common";
import { localize } from "@/types/common";
import type { OutgoingMessage } from "@/services/bot/types";

export class TaxiService {
  generateDeepLinks(from: LatLng, to: LatLng, language: string): OutgoingMessage {
    const kakaoUrl = `https://t.kakao.com/launch?dest_lat=${to.latitude}&dest_lng=${to.longitude}`;
    const uberUrl = `https://m.uber.com/ul/?pickup[latitude]=${from.latitude}&pickup[longitude]=${from.longitude}&dropoff[latitude]=${to.latitude}&dropoff[longitude]=${to.longitude}`;

    const text = localize(
      {
        en: "You can also take a taxi:",
        ko: "택시를 이용할 수도 있습니다:",
        ja: "タクシーも利用できます:",
        zh: "您也可以乘坐出租车:",
      },
      language,
    );

    return {
      type: "buttons",
      text,
      buttons: [
        { id: kakaoUrl, label: "KakaoT" },
        { id: uberUrl, label: "Uber" },
      ],
    };
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/services/transit/taxi.service.test.ts`
Expected: PASS

- [ ] **Step 6: Run full suite**

Run: `npx vitest run`
Expected: ALL PASS

- [ ] **Step 7: Commit**

```bash
git add src/services/transit/
git commit -m "feat: add TaxiService with KakaoT and Uber deep links"
```

---

### Task 7: TransitService

**Files:**
- Create: `src/services/transit/transit.service.ts`
- Create: `src/services/transit/transit.service.test.ts`

**Interfaces:**
- Consumes: `TransitProvider` from `@/lib/external/transit/types`, `LocationResolver` from `@/services/ai/location-resolver`, `TaxiService` from `./taxi.service`, `OutgoingMessage` from `@/services/bot/types`, `LatLng`, `localize` from `@/types/common`
- Produces: `TransitService.searchRoute(from, to, language): Promise<OutgoingMessage[]>` (used by Task 10)

- [ ] **Step 1: Write TransitService test**

Create `src/services/transit/transit.service.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { TransitService } from "./transit.service";
import type { TransitProvider, TransitRoute } from "@/lib/external/transit/types";
import type { LocationResolver } from "@/services/ai/location-resolver";
import { TaxiService } from "./taxi.service";

const MOCK_ROUTE: TransitRoute = {
  summary: "Bus 1003 → Walk",
  duration: 55,
  distance: 18200,
  fare: 2650,
  steps: [
    {
      mode: "bus",
      instruction: { en: "Take Bus 1003", ko: "1003번 버스 탑승" },
      duration: 35,
      distance: 14000,
      line: "1003",
      stops: 18,
    },
    {
      mode: "walk",
      instruction: { en: "Walk 15 min", ko: "도보 15분" },
      duration: 15,
      distance: 900,
    },
  ],
  departureTime: new Date(),
  arrivalTime: new Date(Date.now() + 55 * 60 * 1000),
};

function createMockProvider(routes: TransitRoute[] = [MOCK_ROUTE]): TransitProvider {
  return {
    searchRoutes: vi.fn().mockResolvedValue(routes),
  };
}

function createMockLocationResolver(
  result: { spotId: string; spotName: string; confidence: number; source: "alias" } | null = {
    spotId: "spot-1",
    spotName: "해운대해수욕장",
    confidence: 1.0,
    source: "alias",
  },
): LocationResolver {
  return {
    resolve: vi.fn().mockResolvedValue(result),
  } as unknown as LocationResolver;
}

function createMockSpotRepo(): { getById: ReturnType<typeof vi.fn> } {
  return {
    getById: vi.fn().mockResolvedValue({
      id: "spot-1",
      latitude: 35.1586,
      longitude: 129.1604,
    }),
  };
}

describe("TransitService", () => {
  it("returns formatted route messages when routes are found", async () => {
    const provider = createMockProvider();
    const resolver = createMockLocationResolver();
    const spotRepo = createMockSpotRepo();
    const taxi = new TaxiService();

    const service = new TransitService([provider], resolver, taxi, spotRepo as never);
    const messages = await service.searchRoute("Haeundae", "Gamcheon", "en");

    expect(messages.length).toBeGreaterThan(0);
    expect(messages[0]!.type).toBe("text");
    expect(messages[0]!.text).toContain("Bus 1003");
  });

  it("falls back to taxi links when no routes found", async () => {
    const provider = createMockProvider([]);
    const resolver = createMockLocationResolver();
    const spotRepo = createMockSpotRepo();
    const taxi = new TaxiService();

    const service = new TransitService([provider], resolver, taxi, spotRepo as never);
    const messages = await service.searchRoute("A", "B", "en");

    const hasTaxi = messages.some((m) => m.type === "buttons");
    expect(hasTaxi).toBe(true);
  });

  it("returns error message when location cannot be resolved", async () => {
    const provider = createMockProvider();
    const resolver = createMockLocationResolver(null);
    const spotRepo = createMockSpotRepo();
    const taxi = new TaxiService();

    const service = new TransitService([provider], resolver, taxi, spotRepo as never);
    const messages = await service.searchRoute("unknown", "place", "en");

    expect(messages.length).toBe(1);
    expect(messages[0]!.type).toBe("text");
  });

  it("tries next provider when first fails", async () => {
    const failProvider: TransitProvider = {
      searchRoutes: vi.fn().mockResolvedValue([]),
    };
    const successProvider = createMockProvider();
    const resolver = createMockLocationResolver();
    const spotRepo = createMockSpotRepo();
    const taxi = new TaxiService();

    const service = new TransitService(
      [failProvider, successProvider],
      resolver,
      taxi,
      spotRepo as never,
    );
    const messages = await service.searchRoute("A", "B", "en");

    expect(messages[0]!.text).toContain("Bus 1003");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/services/transit/transit.service.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement TransitService**

Create `src/services/transit/transit.service.ts`:

```typescript
import type { TransitProvider, TransitRoute } from "@/lib/external/transit/types";
import type { LocationResolver } from "@/services/ai/location-resolver";
import type { TaxiService } from "./taxi.service";
import type { SpotRepository } from "@/services/tourism/spot.repository";
import type { OutgoingMessage } from "@/services/bot/types";
import { localize } from "@/types/common";
import type { LatLng } from "@/types/common";

export class TransitService {
  constructor(
    private providers: TransitProvider[],
    private locationResolver: LocationResolver,
    private taxiService: TaxiService,
    private spotRepo: SpotRepository,
  ) {}

  async searchRoute(
    from: string,
    to: string,
    language: string,
  ): Promise<OutgoingMessage[]> {
    // 1. Resolve locations
    const [fromResolved, toResolved] = await Promise.all([
      this.locationResolver.resolve(from, language),
      this.locationResolver.resolve(to, language),
    ]);

    if (!fromResolved || !toResolved) {
      const missing = !fromResolved ? from : to;
      return [{
        type: "text",
        text: localize(
          {
            en: `Sorry, I couldn't find the location "${missing}". Please try a different name.`,
            ko: `죄송합니다, "${missing}" 위치를 찾을 수 없습니다. 다른 이름으로 시도해 주세요.`,
            ja: `申し訳ありませんが、「${missing}」の場所が見つかりませんでした。別の名前をお試しください。`,
            zh: `抱歉，找不到"${missing}"的位置。请尝试其他名称。`,
          },
          language,
        ),
      }];
    }

    // 2. Get coordinates from spot records
    const [fromSpot, toSpot] = await Promise.all([
      this.spotRepo.getById(fromResolved.spotId),
      this.spotRepo.getById(toResolved.spotId),
    ]);

    if (!fromSpot?.latitude || !fromSpot?.longitude || !toSpot?.latitude || !toSpot?.longitude) {
      return [{
        type: "text",
        text: localize(
          {
            en: "Sorry, coordinates are not available for these locations.",
            ko: "죄송합니다, 해당 위치의 좌표 정보가 없습니다.",
            ja: "申し訳ありませんが、これらの場所の座標情報がありません。",
            zh: "抱歉，这些位置没有坐标信息。",
          },
          language,
        ),
      }];
    }

    const fromLatLng: LatLng = { latitude: fromSpot.latitude, longitude: fromSpot.longitude };
    const toLatLng: LatLng = { latitude: toSpot.latitude, longitude: toSpot.longitude };

    // 3. Try each provider in order
    let routes: TransitRoute[] = [];
    for (const provider of this.providers) {
      try {
        routes = await provider.searchRoutes(fromLatLng, toLatLng, { language });
        if (routes.length > 0) break;
      } catch {
        // Try next provider
      }
    }

    // 4. Format results or suggest taxi
    if (routes.length === 0) {
      const noRouteMsg: OutgoingMessage = {
        type: "text",
        text: localize(
          {
            en: "No transit routes found for this trip.",
            ko: "해당 경로의 대중교통 노선을 찾을 수 없습니다.",
            ja: "この経路の公共交通機関のルートが見つかりませんでした。",
            zh: "未找到该路线的公共交通路线。",
          },
          language,
        ),
      };
      const taxiMsg = this.taxiService.generateDeepLinks(fromLatLng, toLatLng, language);
      return [noRouteMsg, taxiMsg];
    }

    return this.formatRoutes(routes.slice(0, 3), language);
  }

  private formatRoutes(routes: TransitRoute[], language: string): OutgoingMessage[] {
    return routes.map((route, index) => {
      const header = localize(
        {
          en: `Route ${index + 1}: ${route.summary}`,
          ko: `경로 ${index + 1}: ${route.summary}`,
          ja: `ルート ${index + 1}: ${route.summary}`,
          zh: `路线 ${index + 1}: ${route.summary}`,
        },
        language,
      );

      const durationLabel = localize(
        { en: "Duration", ko: "소요시간", ja: "所要時間", zh: "所需时间" },
        language,
      );
      const fareLabel = localize(
        { en: "Fare", ko: "요금", ja: "料金", zh: "费用" },
        language,
      );

      const stepsText = route.steps
        .map((step) => {
          const icon = step.mode === "walk" ? "🚶" : step.mode === "bus" ? "🚌" : step.mode === "metro" ? "🚇" : "🚆";
          return `${icon} ${localize(step.instruction, language)} (${step.duration}min)`;
        })
        .join("\n");

      return {
        type: "text" as const,
        text: `${header}\n${durationLabel}: ${route.duration}min | ${fareLabel}: ₩${route.fare.toLocaleString()}\n\n${stepsText}`,
      };
    });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/services/transit/transit.service.test.ts`
Expected: PASS

- [ ] **Step 5: Run full suite**

Run: `npx vitest run`
Expected: ALL PASS

- [ ] **Step 6: Commit**

```bash
git add src/services/transit/transit.service.ts src/services/transit/transit.service.test.ts
git commit -m "feat: add TransitService with provider fallback chain"
```

---

### Task 8: TourismService + EventService

**Files:**
- Create: `src/services/tourism/tourism.service.ts`
- Create: `src/services/tourism/tourism.service.test.ts`
- Create: `src/services/tourism/event.service.ts`
- Create: `src/services/tourism/event.service.test.ts`

**Interfaces:**
- Consumes: `SpotRepository` from `./spot.repository`, `EventRepository` from `./event.repository`, `TourismProvider` from `@/lib/external/tourism/types`, `LocationResolver` from `@/services/ai/location-resolver`, `OutgoingMessage` from `@/services/bot/types`, `localize`, `LocalizedText` from `@/types/common`
- Produces: `TourismService.searchSpots(query, language, category?): Promise<OutgoingMessage[]>`, `TourismService.getSpotDetail(spotId, language): Promise<OutgoingMessage[]>`; `EventService.searchEvents(options, language): Promise<OutgoingMessage[]>` (used by Task 10)

- [ ] **Step 1: Write TourismService test**

Create `src/services/tourism/tourism.service.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { TourismService } from "./tourism.service";
import type { SpotRepository } from "./spot.repository";
import type { TourismProvider } from "@/lib/external/tourism/types";
import type { LocationResolver } from "@/services/ai/location-resolver";
import type { SpotRecord } from "./types";

const MOCK_SPOT: SpotRecord = {
  id: "spot-1",
  nameKo: "해운대해수욕장",
  names: { en: "Haeundae Beach", ko: "해운대해수욕장" },
  description: { en: "Famous beach in Busan", ko: "부산에서 가장 유명한 해수욕장" },
  addressKo: "부산 해운대구",
  addresses: { en: "Haeundae-gu, Busan" },
  latitude: 35.1586,
  longitude: 129.1604,
  phone: null,
  website: null,
  images: [],
  rating: 4.5,
  source: "manual",
  isActive: true,
};

function createMockSpotRepo(results: SpotRecord[] = [MOCK_SPOT]): SpotRepository {
  return {
    searchByName: vi.fn().mockResolvedValue(results),
    searchByCategory: vi.fn().mockResolvedValue(results),
    getById: vi.fn().mockResolvedValue(results[0] ?? null),
    searchBySimilarity: vi.fn().mockResolvedValue([]),
    upsertFromExternal: vi.fn().mockResolvedValue(MOCK_SPOT),
  } as unknown as SpotRepository;
}

function createMockTourismProvider(): TourismProvider {
  return {
    searchSpots: vi.fn().mockResolvedValue([]),
    getSpotDetail: vi.fn().mockResolvedValue(null),
  };
}

function createMockLocationResolver(): LocationResolver {
  return {
    resolve: vi.fn().mockResolvedValue(null),
  } as unknown as LocationResolver;
}

describe("TourismService", () => {
  it("returns formatted spot results from DB", async () => {
    const repo = createMockSpotRepo();
    const provider = createMockTourismProvider();
    const resolver = createMockLocationResolver();
    const service = new TourismService(repo, [provider], resolver);

    const messages = await service.searchSpots("beach", "en");

    expect(messages.length).toBeGreaterThan(0);
    expect(messages[0]!.text).toContain("Haeundae Beach");
  });

  it("falls back to provider when DB has insufficient results", async () => {
    const repo = createMockSpotRepo([]);
    const provider: TourismProvider = {
      searchSpots: vi.fn().mockResolvedValue([{
        externalId: "ext-1",
        names: { en: "External Beach" },
        description: { en: "A beach" },
        address: { en: "Busan" },
        latitude: 35.0,
        longitude: 129.0,
        category: "beach",
        images: [],
      }]),
      getSpotDetail: vi.fn().mockResolvedValue(null),
    };
    const resolver = createMockLocationResolver();
    const service = new TourismService(repo, [provider], resolver);

    const messages = await service.searchSpots("beach", "en");

    expect(provider.searchSpots).toHaveBeenCalled();
  });

  it("getSpotDetail returns detailed info", async () => {
    const repo = createMockSpotRepo();
    const provider = createMockTourismProvider();
    const resolver = createMockLocationResolver();
    const service = new TourismService(repo, [provider], resolver);

    const messages = await service.getSpotDetail("spot-1", "en");

    expect(messages.length).toBeGreaterThan(0);
    expect(messages[0]!.text).toContain("Haeundae Beach");
  });

  it("returns 'no results' message when nothing found", async () => {
    const repo = createMockSpotRepo([]);
    const provider = createMockTourismProvider();
    const resolver = createMockLocationResolver();
    const service = new TourismService(repo, [provider], resolver);

    const messages = await service.searchSpots("zzzznonexistent", "en");

    expect(messages.length).toBe(1);
    expect(messages[0]!.type).toBe("text");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/services/tourism/tourism.service.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement TourismService**

Create `src/services/tourism/tourism.service.ts`:

```typescript
import type { SpotRepository } from "./spot.repository";
import type { TourismProvider } from "@/lib/external/tourism/types";
import type { LocationResolver } from "@/services/ai/location-resolver";
import type { OutgoingMessage } from "@/services/bot/types";
import type { SpotRecord } from "./types";
import { localize } from "@/types/common";

const MIN_DB_RESULTS = 3;

export class TourismService {
  constructor(
    private spotRepo: SpotRepository,
    private providers: TourismProvider[],
    private locationResolver: LocationResolver,
  ) {}

  async searchSpots(
    query: string,
    language: string,
    category?: string,
  ): Promise<OutgoingMessage[]> {
    // 1. Search DB first
    let spots: SpotRecord[];
    if (category) {
      spots = await this.spotRepo.searchByCategory(category);
    } else {
      spots = await this.spotRepo.searchByName(query);
    }

    // 2. If insufficient results, query external providers
    if (spots.length < MIN_DB_RESULTS) {
      for (const provider of this.providers) {
        try {
          const externalSpots = await provider.searchSpots(query, {
            category,
            limit: 5,
            language,
          });

          // Cache external results in DB
          for (const ext of externalSpots) {
            try {
              const cached = await this.spotRepo.upsertFromExternal(ext, "external_api");
              if (!spots.find((s) => s.id === cached.id)) {
                spots.push(cached);
              }
            } catch {
              // Non-critical: skip if caching fails
            }
          }

          if (spots.length >= MIN_DB_RESULTS) break;
        } catch {
          // Try next provider
        }
      }
    }

    if (spots.length === 0) {
      return [{
        type: "text",
        text: localize(
          {
            en: `No spots found for "${query}". Try a different search term.`,
            ko: `"${query}"에 대한 관광지를 찾을 수 없습니다. 다른 검색어를 시도해 주세요.`,
            ja: `「${query}」に関する観光スポットが見つかりませんでした。別の検索語をお試しください。`,
            zh: `未找到"${query}"相关的景点。请尝试其他搜索词。`,
          },
          language,
        ),
      }];
    }

    // 3. Format as buttons message
    return [{
      type: "buttons",
      text: localize(
        {
          en: `Found ${spots.length} spot(s):`,
          ko: `${spots.length}개의 관광지를 찾았습니다:`,
          ja: `${spots.length}件のスポットが見つかりました:`,
          zh: `找到${spots.length}个景点:`,
        },
        language,
      ),
      buttons: spots.slice(0, 5).map((s) => ({
        id: `spot_detail:${s.id}`,
        label: localize(s.names, language) || s.nameKo,
      })),
    }];
  }

  async getSpotDetail(spotId: string, language: string): Promise<OutgoingMessage[]> {
    const spot = await this.spotRepo.getById(spotId);
    if (!spot) {
      return [{
        type: "text",
        text: localize(
          {
            en: "Spot not found.",
            ko: "관광지를 찾을 수 없습니다.",
            ja: "スポットが見つかりませんでした。",
            zh: "未找到景点。",
          },
          language,
        ),
      }];
    }

    const name = localize(spot.names, language) || spot.nameKo;
    const desc = localize(spot.description, language);
    const addr = localize(spot.addresses, language) || spot.addressKo || "";

    const parts = [name, ""];
    if (desc) parts.push(desc, "");
    if (addr) {
      const addrLabel = localize({ en: "Address", ko: "주소", ja: "住所", zh: "地址" }, language);
      parts.push(`📍 ${addrLabel}: ${addr}`);
    }
    if (spot.rating) {
      parts.push(`⭐ ${spot.rating}/5`);
    }
    if (spot.phone) {
      parts.push(`📞 ${spot.phone}`);
    }
    if (spot.website) {
      parts.push(`🌐 ${spot.website}`);
    }

    const messages: OutgoingMessage[] = [{ type: "text", text: parts.join("\n") }];

    if (spot.latitude && spot.longitude) {
      messages.push({
        type: "location",
        location: { latitude: spot.latitude, longitude: spot.longitude, label: name },
      });
    }

    return messages;
  }
}
```

- [ ] **Step 4: Run TourismService test**

Run: `npx vitest run src/services/tourism/tourism.service.test.ts`
Expected: PASS

- [ ] **Step 5: Write EventService test**

Create `src/services/tourism/event.service.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { EventService } from "./event.service";
import type { EventRepository } from "./event.repository";
import type { EventRecord } from "./types";

const MOCK_EVENT: EventRecord = {
  id: "event-1",
  nameKo: "부산국제영화제",
  names: { en: "Busan International Film Festival", ko: "부산국제영화제" },
  description: { en: "One of Asia's most prestigious film festivals." },
  category: "festival",
  venueName: { en: "Busan Cinema Center" },
  addressKo: "부산시 해운대구",
  latitude: 35.1586,
  longitude: 129.1604,
  startsAt: new Date("2026-10-01"),
  endsAt: new Date("2026-10-10"),
  priceInfo: { en: "Free screenings available" },
  bookingUrl: "https://biff.kr",
  images: [],
  source: "manual",
  isActive: true,
};

function createMockEventRepo(results: EventRecord[] = [MOCK_EVENT]): EventRepository {
  return {
    getActiveEvents: vi.fn().mockResolvedValue(results),
    getById: vi.fn().mockResolvedValue(results[0] ?? null),
  } as unknown as EventRepository;
}

describe("EventService", () => {
  it("returns formatted event list", async () => {
    const repo = createMockEventRepo();
    const service = new EventService(repo);

    const messages = await service.searchEvents({}, "en");

    expect(messages.length).toBeGreaterThan(0);
    expect(messages[0]!.text).toContain("Busan International Film Festival");
  });

  it("includes booking URL when available", async () => {
    const repo = createMockEventRepo();
    const service = new EventService(repo);

    const messages = await service.searchEvents({}, "en");
    const text = messages.map((m) => m.text).join(" ");

    expect(text).toContain("biff.kr");
  });

  it("returns 'no events' message when empty", async () => {
    const repo = createMockEventRepo([]);
    const service = new EventService(repo);

    const messages = await service.searchEvents({}, "en");

    expect(messages.length).toBe(1);
    expect(messages[0]!.type).toBe("text");
  });

  it("passes date and category filters to repository", async () => {
    const repo = createMockEventRepo();
    const service = new EventService(repo);
    const date = new Date("2026-10-05");

    await service.searchEvents({ date, category: "festival" }, "en");

    expect(repo.getActiveEvents).toHaveBeenCalledWith({
      date,
      category: "festival",
    });
  });
});
```

- [ ] **Step 6: Implement EventService**

Create `src/services/tourism/event.service.ts`:

```typescript
import type { EventRepository } from "./event.repository";
import type { OutgoingMessage } from "@/services/bot/types";
import { localize } from "@/types/common";

export class EventService {
  constructor(private eventRepo: EventRepository) {}

  async searchEvents(
    options: { date?: Date; category?: string },
    language: string,
  ): Promise<OutgoingMessage[]> {
    const events = await this.eventRepo.getActiveEvents({
      date: options.date,
      category: options.category,
    });

    if (events.length === 0) {
      return [{
        type: "text",
        text: localize(
          {
            en: "No events found for the selected criteria.",
            ko: "선택한 조건에 맞는 이벤트를 찾을 수 없습니다.",
            ja: "選択した条件に一致するイベントが見つかりませんでした。",
            zh: "未找到符合条件的活动。",
          },
          language,
        ),
      }];
    }

    const header = localize(
      {
        en: `Found ${events.length} event(s):`,
        ko: `${events.length}개의 이벤트를 찾았습니다:`,
        ja: `${events.length}件のイベントが見つかりました:`,
        zh: `找到${events.length}个活动:`,
      },
      language,
    );

    const eventTexts = events.map((event) => {
      const name = localize(event.names, language) || event.nameKo;
      const desc = localize(event.description, language);
      const venue = localize(event.venueName, language);
      const dateRange = `${event.startsAt.toLocaleDateString()} - ${event.endsAt.toLocaleDateString()}`;

      const parts = [`📅 ${name}`, `   ${dateRange}`];
      if (venue) parts.push(`   📍 ${venue}`);
      if (desc) parts.push(`   ${desc}`);
      if (event.bookingUrl) parts.push(`   🔗 ${event.bookingUrl}`);

      return parts.join("\n");
    });

    return [{
      type: "text",
      text: `${header}\n\n${eventTexts.join("\n\n")}`,
    }];
  }
}
```

- [ ] **Step 7: Run EventService test**

Run: `npx vitest run src/services/tourism/event.service.test.ts`
Expected: PASS

- [ ] **Step 8: Run full suite**

Run: `npx vitest run`
Expected: ALL PASS

- [ ] **Step 9: Commit**

```bash
git add src/services/tourism/tourism.service.ts src/services/tourism/tourism.service.test.ts src/services/tourism/event.service.ts src/services/tourism/event.service.test.ts
git commit -m "feat: add TourismService and EventService"
```

---

### Task 9: LocationResolver Stage 2 (Embedding Search)

**Files:**
- Modify: `src/services/ai/location-resolver.ts`
- Modify: `src/services/ai/location-resolver.test.ts`

**Interfaces:**
- Consumes: `EmbeddingProvider` from `@/lib/external/embedding/types`, `SpotRepository` from `@/services/tourism/spot.repository`, existing `Database`, `LLMRouter` dependencies
- Produces: Updated `LocationResolver` constructor: `(db, router, embeddingProvider?, spotRepo?)` — embedding search between Stage 1 (alias) and Stage 3 (LLM), using `searchBySimilarity` with threshold 0.8

- [ ] **Step 1: Write Stage 2 test**

Add to `src/services/ai/location-resolver.test.ts`:

```typescript
import type { EmbeddingProvider } from "@/lib/external/embedding/types";
import type { SpotRepository } from "@/services/tourism/spot.repository";

function createMockEmbeddingProvider(): EmbeddingProvider {
  return {
    embed: vi.fn().mockResolvedValue([[0.1, 0.2, 0.3]]),
    dimensions: 3,
  };
}

function createMockSpotRepo(similarResults: unknown[] = []): SpotRepository {
  return {
    searchBySimilarity: vi.fn().mockResolvedValue(similarResults),
    searchByName: vi.fn().mockResolvedValue([]),
    searchByCategory: vi.fn().mockResolvedValue([]),
    getById: vi.fn().mockResolvedValue(null),
    upsertFromExternal: vi.fn(),
  } as unknown as SpotRepository;
}
```

Add these test cases inside the existing `describe("LocationResolver")` block:

```typescript
it("Stage 2: returns result from embedding similarity search", async () => {
  const mockDb = createMockDb([]); // No alias match
  const router = createMockRouter("{}");
  const embeddingProvider = createMockEmbeddingProvider();
  const spotRepo = createMockSpotRepo([
    {
      id: "spot-1",
      nameKo: "해운대해수욕장",
      names: { en: "Haeundae Beach" },
      similarity: 0.92,
      description: {}, addressKo: null, addresses: {},
      latitude: 35.1586, longitude: 129.1604,
      phone: null, website: null, images: [], rating: null,
      source: "manual", isActive: true,
    },
  ]);

  const resolver = new LocationResolver(mockDb, router, embeddingProvider, spotRepo);
  const result = await resolver.resolve("haeundae beach", "en");

  expect(result).not.toBeNull();
  expect(result!.source).toBe("embedding");
  expect(result!.spotId).toBe("spot-1");
  expect(result!.confidence).toBe(0.92);
  // LLM should NOT have been called
  expect(router.lightweightJson).not.toHaveBeenCalled();
});

it("Stage 2: skips to Stage 3 when embedding has no results", async () => {
  const mockDb = createMockDb([], [
    { id: "spot-1", nameKo: "자갈치시장", names: { en: "Jagalchi Market" } },
  ]);
  const router = createMockRouter(JSON.stringify({
    matchIndex: 1, confidence: 0.9, reasoning: "match",
  }));
  const embeddingProvider = createMockEmbeddingProvider();
  const spotRepo = createMockSpotRepo([]); // No embedding match

  const resolver = new LocationResolver(mockDb, router, embeddingProvider, spotRepo);
  const result = await resolver.resolve("fish market", "en");

  expect(result).not.toBeNull();
  expect(result!.source).toBe("gpt"); // Fell through to Stage 3
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/services/ai/location-resolver.test.ts`
Expected: FAIL — `LocationResolver` constructor does not accept 4 arguments

- [ ] **Step 3: Implement Stage 2 in LocationResolver**

Modify `src/services/ai/location-resolver.ts`:

1. Add imports at top:

```typescript
import type { EmbeddingProvider } from "@/lib/external/embedding/types";
import type { SpotRepository } from "@/services/tourism/spot.repository";
```

2. Update constructor:

```typescript
constructor(
  private db: Database,
  private router: LLMRouter,
  private embeddingProvider?: EmbeddingProvider,
  private spotRepo?: SpotRepository,
) {}
```

3. Replace the Stage 2 TODO comment block in `resolve()`:

```typescript
// Stage 2: Embedding similarity search
if (this.embeddingProvider && this.spotRepo) {
  const embeddingResult = await this.searchByEmbedding(query);
  if (embeddingResult) return embeddingResult;
}
```

4. Add the `searchByEmbedding` method:

```typescript
private async searchByEmbedding(
  query: string,
): Promise<ResolvedLocation | null> {
  if (!this.embeddingProvider || !this.spotRepo) return null;

  try {
    const [queryVector] = await this.embeddingProvider.embed([query]);
    if (!queryVector || queryVector.length === 0) return null;

    const matches = await this.spotRepo.searchBySimilarity(queryVector, 0.8, 1);
    if (matches.length === 0 || !matches[0]) return null;

    return {
      spotId: matches[0].id,
      spotName: matches[0].nameKo,
      confidence: matches[0].similarity,
      source: "embedding",
    };
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/services/ai/location-resolver.test.ts`
Expected: ALL PASS (existing tests continue to pass because embeddingProvider/spotRepo are optional)

- [ ] **Step 5: Run full suite**

Run: `npx vitest run`
Expected: ALL PASS

- [ ] **Step 6: Commit**

```bash
git add src/services/ai/location-resolver.ts src/services/ai/location-resolver.test.ts
git commit -m "feat: add LocationResolver Stage 2 embedding similarity search"
```

---

### Task 10: ActionRegistry + MessageHandler Integration

**Files:**
- Create: `src/services/bot/action-registry.ts`
- Create: `src/services/bot/action-registry.test.ts`
- Modify: `src/services/bot/message-handler.ts`
- Modify: `src/services/bot/message-handler.test.ts`

**Interfaces:**
- Consumes: `TransitService.searchRoute()` from `@/services/transit/transit.service`, `TourismService.searchSpots()`, `TourismService.getSpotDetail()` from `@/services/tourism/tourism.service`, `EventService.searchEvents()` from `@/services/tourism/event.service`, `TaxiService.generateDeepLinks()` from `@/services/transit/taxi.service`, `OutgoingMessage` from `./types`
- Produces: `ActionRegistry` class with `register()`, `has()`, `execute()` methods; updated `MessageHandler` that dispatches `apiAction` through `ActionRegistry` instead of sending placeholder text

- [ ] **Step 1: Write ActionRegistry test**

Create `src/services/bot/action-registry.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { ActionRegistry } from "./action-registry";

describe("ActionRegistry", () => {
  it("registers and executes a handler", async () => {
    const registry = new ActionRegistry();
    const handler = vi.fn().mockResolvedValue([{ type: "text", text: "result" }]);

    registry.register("test_action", handler);

    expect(registry.has("test_action")).toBe(true);
    const result = await registry.execute("test_action", { key: "value" }, "en");

    expect(handler).toHaveBeenCalledWith({ key: "value" }, "en");
    expect(result).toEqual([{ type: "text", text: "result" }]);
  });

  it("has() returns false for unregistered action", () => {
    const registry = new ActionRegistry();
    expect(registry.has("nonexistent")).toBe(false);
  });

  it("execute() throws for unregistered action", async () => {
    const registry = new ActionRegistry();
    await expect(
      registry.execute("nonexistent", {}, "en"),
    ).rejects.toThrow("Unknown action: nonexistent");
  });

  it("supports multiple registered actions", async () => {
    const registry = new ActionRegistry();
    const handler1 = vi.fn().mockResolvedValue([{ type: "text", text: "one" }]);
    const handler2 = vi.fn().mockResolvedValue([{ type: "text", text: "two" }]);

    registry.register("action_one", handler1);
    registry.register("action_two", handler2);

    const r1 = await registry.execute("action_one", {}, "en");
    const r2 = await registry.execute("action_two", {}, "en");

    expect(r1[0]!.text).toBe("one");
    expect(r2[0]!.text).toBe("two");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/services/bot/action-registry.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement ActionRegistry**

Create `src/services/bot/action-registry.ts`:

```typescript
import type { OutgoingMessage } from "./types";

export type ActionHandler = (
  params: Record<string, unknown>,
  language: string,
) => Promise<OutgoingMessage[]>;

export class ActionRegistry {
  private handlers = new Map<string, ActionHandler>();

  register(actionName: string, handler: ActionHandler): void {
    this.handlers.set(actionName, handler);
  }

  has(actionName: string): boolean {
    return this.handlers.has(actionName);
  }

  async execute(
    actionName: string,
    params: Record<string, unknown>,
    language: string,
  ): Promise<OutgoingMessage[]> {
    const handler = this.handlers.get(actionName);
    if (!handler) {
      throw new Error(`Unknown action: ${actionName}`);
    }
    return handler(params, language);
  }
}
```

- [ ] **Step 4: Run ActionRegistry test**

Run: `npx vitest run src/services/bot/action-registry.test.ts`
Expected: PASS

- [ ] **Step 5: Write MessageHandler integration test for apiAction dispatch**

Add to `src/services/bot/message-handler.test.ts`:

First, add the import at the top:

```typescript
import type { ActionRegistry } from "./action-registry";
```

Add a mock factory:

```typescript
function createMockActionRegistry(): ActionRegistry {
  return {
    has: vi.fn().mockReturnValue(true),
    execute: vi.fn().mockResolvedValue([
      { type: "text", text: "Route found: Bus 1003 → Metro Line 1" },
    ]),
    register: vi.fn(),
  } as unknown as ActionRegistry;
}
```

Add a test case inside the `describe("MessageHandler")` block:

```typescript
it("dispatches apiAction through ActionRegistry instead of placeholder", async () => {
  const session: SessionRecord = {
    id: "s1", userId: "user-1", mode: "flow",
    activeFlowId: "f1", currentStepId: "step-1", flowContext: { step_1: "Haeundae" }, isActive: true,
  };
  sessionRepo = createMockSessionRepo(session);

  const apiFlowEngine = {
    startFlow: vi.fn(),
    handleInput: vi.fn().mockResolvedValue({
      messages: [],
      nextStepId: "step-3",
      flowContext: { step_1: "Haeundae", step_2: "Gamcheon" },
      completed: false,
      apiAction: "search_transit_route",
    }),
  } as unknown as FlowEngine;

  const actionRegistry = createMockActionRegistry();
  handler = new MessageHandler(sessionRepo, menuService, apiFlowEngine, chatService, langService, actionRegistry);

  await handler.handle(adapter, createIncomingText("Gamcheon"));

  expect(actionRegistry.execute).toHaveBeenCalledWith(
    "search_transit_route",
    expect.objectContaining({ step_1: "Haeundae", step_2: "Gamcheon" }),
    "en",
  );
  const sentMsg = (adapter.sendMessage as ReturnType<typeof vi.fn>).mock.calls[0]?.[1] as OutgoingMessage;
  expect(sentMsg.text).toContain("Route found");
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx vitest run src/services/bot/message-handler.test.ts`
Expected: FAIL — `MessageHandler` constructor does not accept 6 arguments

- [ ] **Step 7: Update MessageHandler to use ActionRegistry**

Modify `src/services/bot/message-handler.ts`:

1. Add import:

```typescript
import type { ActionRegistry } from "./action-registry";
```

2. Update constructor to accept `actionRegistry` as optional last parameter:

```typescript
constructor(
  private sessionRepo: SessionRepository,
  private menuService: MenuService,
  private flowEngine: FlowEngine,
  private chatService: ChatService,
  private languageService: LanguageService,
  private actionRegistry?: ActionRegistry,
) {}
```

3. Replace the `TODO[MVP]` apiAction block in `handleFlowMode()` (lines 147-159):

```typescript
if (result.apiAction) {
  await this.sessionRepo.updateSessionMode(session.id, "flow", {
    currentStepId: result.nextStepId ?? undefined,
    flowContext: result.flowContext,
  });

  if (this.actionRegistry?.has(result.apiAction)) {
    const actionMessages = await this.actionRegistry.execute(
      result.apiAction,
      result.flowContext as Record<string, unknown>,
      language,
    );
    await this.sendMessages(adapter, incoming.chatId, actionMessages);
  } else {
    await this.sendMessages(adapter, incoming.chatId, [{
      type: "text",
      text: `[API Action: ${result.apiAction}] — This feature will be available in a future update.`,
    }]);
  }
  return;
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npx vitest run src/services/bot/message-handler.test.ts`
Expected: ALL PASS (existing tests pass because `actionRegistry` is optional)

- [ ] **Step 9: Run full suite**

Run: `npx vitest run`
Expected: ALL PASS

- [ ] **Step 10: Commit**

```bash
git add src/services/bot/action-registry.ts src/services/bot/action-registry.test.ts src/services/bot/message-handler.ts src/services/bot/message-handler.test.ts
git commit -m "feat: add ActionRegistry and integrate with MessageHandler"
```

---

## Self-Review

**1. Spec coverage check:**

| Spec Requirement | Task |
|---|---|
| TransitProvider interface + mock | Task 2 |
| TourismProvider interface + mock | Task 3 |
| RealtimeProvider interface + mock | Task 4 |
| EmbeddingProvider interface + mock | Task 4 |
| SpotRepository | Task 5 |
| EventRepository | Task 5 |
| TransitService | Task 7 |
| TourismService | Task 8 |
| EventService | Task 8 |
| TaxiService | Task 6 |
| ActionRegistry | Task 10 |
| LocationResolver Stage 2 | Task 9 |
| MessageHandler integration | Task 10 |
| LatLng shared type | Task 1 |
| Environment variables | Task 1 |
| Real API adapters (Google Maps, Naver, TAGO, TourAPI, Google Places, HuggingFace) | Out of scope for mock-first plan; adapters swap in later when keys are provisioned |

**2. Placeholder scan:** No TBD, TODO, or vague steps found. All tasks have concrete code.

**3. Type consistency:**
- `LatLng` defined in Task 1, used in Tasks 2, 6, 7
- `TransitProvider` defined in Task 2, consumed in Task 7
- `TourismProvider` defined in Task 3, consumed in Task 8
- `EmbeddingProvider` defined in Task 4, consumed in Task 9
- `SpotRepository` defined in Task 5, consumed in Tasks 7, 8, 9
- `EventRepository` defined in Task 5, consumed in Task 8
- `TaxiService` defined in Task 6, consumed in Task 7
- `ActionRegistry` defined in Task 10, consumed in Task 10 (MessageHandler)
- `OutgoingMessage` from `@/services/bot/types` used consistently
- `LocationResolver` constructor updated in Task 9 with optional params — backward compatible

All method signatures match across producer/consumer tasks.
