# SP3: Tourism & Transit — Design Spec

## Overview

**What:** SP3 adds tourism spot search, transit route finding, event discovery, taxi deep links, and embedding-based location search to PiggyBack. External APIs are abstracted behind Provider interfaces; Mock implementations ship first, with real API adapters swapped in as keys are provisioned.

**Why:** SP2 delivered bot integration with CMS-managed flows, but flow steps with `apiAction` (e.g., "search_transit_route") return placeholder messages. SP3 implements the actual service logic behind those actions so tourists can search routes, discover spots, find events, and hail taxis through the bot.

**Architecture:** Port-Adapter pattern for external APIs. Services depend on Provider interfaces, not concrete API clients. An ActionRegistry bridges FlowEngine's `apiAction` dispatch to service methods. LocationResolver gains Stage 2 (embedding similarity search via pgvector).

---

## Scope

### In Scope
- External API Provider interfaces + Mock implementations
- Real API adapters (Google Maps, Naver Maps, TAGO, TourAPI, Google Places, HuggingFace)
- Service layer: TransitService, TourismService, EventService, TaxiService
- Repository layer: SpotRepository, EventRepository
- ActionRegistry: `apiAction` string → service method dispatch
- LocationResolver Stage 2: embedding similarity search
- MessageHandler integration: replace TODO[MVP] placeholder with ActionRegistry dispatch
- Environment variable additions for new API keys

### Out of Scope
- Admin CMS (event/spot management UI, dashboards) → separate SP
- Booking integration (Klook, KKday) → separate SP
- Push notifications / scheduled messages
- Analytics / usage tracking

---

## Provider Interfaces

### Shared Types

```typescript
// src/types/common.ts (add to existing file)

interface LatLng {
  latitude: number;
  longitude: number;
}
```

`LatLng` is added to the existing `src/types/common.ts` since it's used across transit, tourism, and taxi services.

### TransitProvider

```typescript
// src/lib/external/transit/types.ts

interface TransitRoute {
  summary: string;              // "Bus 1003 → Metro Line 2"
  duration: number;             // total minutes
  distance: number;             // total meters
  fare: number;                 // KRW
  steps: TransitStep[];
  departureTime: Date;
  arrivalTime: Date;
}

interface TransitStep {
  mode: "walk" | "bus" | "metro" | "train";
  instruction: LocalizedText;   // { en: "Walk 5 min to Busan Station", ko: "부산역까지 도보 5분" }
  duration: number;             // minutes
  distance: number;             // meters
  line?: string;                // "1003", "Line 2"
  stops?: number;               // number of stops
  departureStop?: string;
  arrivalStop?: string;
}

interface TransitProvider {
  searchRoutes(
    from: LatLng,
    to: LatLng,
    options?: { departureTime?: Date; language?: string },
  ): Promise<TransitRoute[]>;
}
```

### TourismProvider

```typescript
// src/lib/external/tourism/types.ts

interface TourismSpotExternal {
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

interface TourismProvider {
  searchSpots(
    query: string,
    options?: { category?: string; limit?: number; language?: string },
  ): Promise<TourismSpotExternal[]>;
  getSpotDetail(externalId: string): Promise<TourismSpotExternal | null>;
}
```

### RealtimeProvider

```typescript
// src/lib/external/realtime/types.ts

interface RealtimeArrival {
  line: string;
  destination: string;
  arrivalMinutes: number;
  vehicleId?: string;
}

interface RealtimeProvider {
  getArrivals(stopId: string): Promise<RealtimeArrival[]>;
}
```

### EmbeddingProvider

```typescript
// src/lib/external/embedding/types.ts

interface EmbeddingProvider {
  embed(texts: string[]): Promise<number[][]>;
  readonly dimensions: number;  // e.g., 1024 for BGE-M3
}
```

---

## File Structure

```
src/lib/external/
├── transit/
│   ├── types.ts                    # TransitProvider interface + TransitRoute, TransitStep, LatLng
│   ├── mock.provider.ts            # Hardcoded Busan routes for testing
│   ├── google-maps.provider.ts     # Google Maps Directions API
│   └── naver-maps.provider.ts      # Naver Maps Directions API
├── tourism/
│   ├── types.ts                    # TourismProvider interface + TourismSpotExternal
│   ├── mock.provider.ts            # Hardcoded Busan spots
│   ├── tour-api.provider.ts        # 한국관광공사 TourAPI
│   └── google-places.provider.ts   # Google Places API
├── realtime/
│   ├── types.ts                    # RealtimeProvider interface + RealtimeArrival
│   ├── mock.provider.ts            # Hardcoded arrival data
│   └── tago.provider.ts            # TAGO 실시간 도착정보
└── embedding/
    ├── types.ts                    # EmbeddingProvider interface
    ├── mock.provider.ts            # Returns zero vectors for testing
    └── huggingface.provider.ts     # HuggingFace Inference API (BGE-M3)

src/services/transit/
├── transit.service.ts              # Route search with provider fallback
├── transit.service.test.ts
├── taxi.service.ts                 # KakaoT/Uber deep link generation
├── taxi.service.test.ts
└── types.ts

src/services/tourism/
├── tourism.service.ts              # Spot search with DB-first, API fallback
├── tourism.service.test.ts
├── spot.repository.ts              # Drizzle queries for tourismSpots, locationAliases
├── spot.repository.test.ts
├── event.service.ts                # Event search by date/category
├── event.service.test.ts
├── event.repository.ts             # Drizzle queries for events
└── types.ts

src/services/bot/
├── action-registry.ts              # apiAction → service method mapping
└── action-registry.test.ts
```

---

## Service Layer

### ActionRegistry

Maps `apiAction` strings from FlowEngine to service handler functions.

```typescript
// src/services/bot/action-registry.ts

type ActionHandler = (
  params: Record<string, unknown>,
  language: string,
) => Promise<OutgoingMessage[]>;

class ActionRegistry {
  private handlers = new Map<string, ActionHandler>();

  register(actionName: string, handler: ActionHandler): void;
  has(actionName: string): boolean;
  execute(actionName: string, params: Record<string, unknown>, language: string): Promise<OutgoingMessage[]>;
}
```

**Registered actions:**

| apiAction | Service | Description |
|-----------|---------|-------------|
| `search_transit_route` | TransitService | Search transit routes between two locations |
| `search_tourism_spot` | TourismService | Search tourism spots by query/category |
| `search_events` | EventService | Search events by date/category |
| `get_taxi_deeplink` | TaxiService | Generate taxi app deep links |
| `get_spot_detail` | TourismService | Get detailed spot information |

### TransitService

```typescript
class TransitService {
  constructor(
    private providers: TransitProvider[],     // fallback chain
    private locationResolver: LocationResolver,
    private taxiService: TaxiService,
  ) {}

  async searchRoute(from: string, to: string, language: string): Promise<OutgoingMessage[]>;
}
```

**Flow:**
1. Resolve `from` and `to` via LocationResolver → `LatLng`
2. Try each TransitProvider in order until one returns routes
3. Format top 2-3 routes as OutgoingMessage (text with step details)
4. If no routes found, suggest taxi via TaxiService deep links

### TourismService

```typescript
class TourismService {
  constructor(
    private spotRepo: SpotRepository,
    private providers: TourismProvider[],
    private locationResolver: LocationResolver,
  ) {}

  async searchSpots(query: string, language: string, category?: string): Promise<OutgoingMessage[]>;
  async getSpotDetail(spotId: string, language: string): Promise<OutgoingMessage[]>;
}
```

**Flow:**
1. Search SpotRepository (DB) first
2. If results < 3, query TourismProviders for more
3. Cache external results in DB via `spotRepo.upsertFromExternal()`
4. Format as buttons message (up to platform max)

### EventService

```typescript
class EventService {
  constructor(private eventRepo: EventRepository) {}

  async searchEvents(
    options: { date?: Date; category?: string },
    language: string,
  ): Promise<OutgoingMessage[]>;
}
```

**Flow:**
1. Query EventRepository with date range and/or category filter
2. Format active events as localized text/buttons message
3. Include booking URLs where available

### TaxiService

```typescript
class TaxiService {
  generateDeepLinks(from: LatLng, to: LatLng, language: string): OutgoingMessage;
}
```

**Output:** Buttons message with KakaoT and Uber deep links. No API key required — URL pattern only.

- KakaoT: `https://t.kakao.com/launch?dest_lat={lat}&dest_lng={lng}`
- Uber: `https://m.uber.com/ul/?pickup[latitude]={lat}&pickup[longitude]={lng}&dropoff[latitude]={lat}&dropoff[longitude]={lng}`

---

## Repository Layer

### SpotRepository

```typescript
class SpotRepository {
  constructor(private db: Database) {}

  async searchByName(query: string, limit?: number): Promise<SpotRecord[]>;
  async searchByCategory(category: string, limit?: number): Promise<SpotRecord[]>;
  async getById(id: string): Promise<SpotRecord | null>;
  async searchBySimilarity(embedding: number[], threshold?: number, limit?: number): Promise<SpotRecord[]>;
  async upsertFromExternal(spot: TourismSpotExternal, source: string): Promise<SpotRecord>;
}
```

### EventRepository

```typescript
class EventRepository {
  constructor(private db: Database) {}

  async getActiveEvents(options?: { date?: Date; category?: string; limit?: number }): Promise<EventRecord[]>;
  async getById(id: string): Promise<EventRecord | null>;
}
```

---

## LocationResolver Stage 2: Embedding Search

Currently `TODO[MVP]` in `location-resolver.ts`. Implementation:

```
Stage 1: DB alias lookup ($0, existing)
    ↓ miss
Stage 2: Embedding similarity search (~$0.0005, NEW)
    - EmbeddingProvider.embed([query]) → query vector
    - SpotRepository.searchBySimilarity(vector, threshold=0.8, limit=3)
    - If match found (similarity ≥ 0.8): return with confidence = similarity score
    ↓ miss
Stage 3: LLM inference (~$0 Groq, existing)
    - Unchanged behavior
    - Self-learning alias cache on success
```

The `searchBySimilarity` method uses pgvector's cosine distance operator:
```sql
SELECT *, 1 - (embedding <=> $1::vector) as similarity
FROM tourism_spots
WHERE is_active = true
ORDER BY embedding <=> $1::vector
LIMIT $2
```

---

## MessageHandler Integration

Replace the current placeholder in `message-handler.ts`:

```typescript
// Current (placeholder):
if (result.apiAction) {
  await adapter.sendMessage(chatId, {
    type: "text",
    text: `[API Action: ${result.apiAction}] — This feature will be available soon.`,
  });
}

// After SP3:
if (result.apiAction && this.actionRegistry.has(result.apiAction)) {
  const messages = await this.actionRegistry.execute(
    result.apiAction,
    result.flowContext as Record<string, unknown>,
    language,
  );
  for (const msg of messages) {
    await adapter.sendMessage(chatId, msg);
  }
}
```

MessageHandler constructor gains `actionRegistry: ActionRegistry` dependency.

---

## Environment Variables (New)

```typescript
// Added to src/lib/env.ts

// Transit APIs
GOOGLE_MAPS_API_KEY: z.string().default(""),
NAVER_CLIENT_ID: z.string().default(""),
NAVER_CLIENT_SECRET: z.string().default(""),
TAGO_API_KEY: z.string().default(""),

// Tourism APIs
TOUR_API_KEY: z.string().default(""),
GOOGLE_PLACES_API_KEY: z.string().default(""),

// Embedding
// HF_API_TOKEN already defined
```

All default to empty string — when empty, corresponding real providers are skipped and mock providers are used.

---

## Error Handling

All external API calls use `Result<T>` pattern from `src/types/common.ts`.

**Provider-level:** Each provider wraps its API call in try/catch, returns empty array on failure (logged as warning). No provider failure crashes the service.

**Service-level fallback chains:**
- Transit: Provider 1 (Google) → Provider 2 (Naver) → "No routes found" + taxi links
- Tourism: DB → Provider 1 (TourAPI) → Provider 2 (Google Places) → "No results"
- Embedding: HuggingFace → skip to Stage 3 (LLM)

**User-facing:** All error messages are localized (en/ko/ja/zh). The user never sees raw API errors.

---

## Testing Strategy

- All services tested with Mock providers (no real API calls)
- Provider implementations have unit tests with mocked `fetch`
- Repositories tested with mocked Drizzle `Database`
- ActionRegistry tested with mock handlers
- Integration: MessageHandler → ActionRegistry → Service → Mock Provider chain
- ~40-50 tests expected

---

## Mock Data

Mock providers return hardcoded Busan-specific data:

**Transit mocks:** Haeundae → Gamcheon Culture Village (Bus 1003 + Metro Line 1), Busan Station → Haeundae (Metro Line 1 → Line 2)

**Tourism mocks:** Haeundae Beach, Gamcheon Culture Village, Jagalchi Market, Haedong Yonggungsa Temple, BIFF Square

**Event mocks:** Busan International Film Festival, Haeundae Sand Festival, Gwangalli Eobang Festival

**Realtime mocks:** Bus 1003 arriving in 3/8/15 min, Metro Line 1 arriving in 2/6 min
