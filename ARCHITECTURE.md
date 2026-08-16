# ARCHITECTURE.md

## System Overview
VIA BUSAN — 부산 외국인 관광 통합 메신저 봇 플랫폼. Next.js 15 monolith on Vercel.

## Module Structure
- `src/app/` — Next.js App Router (pages, API routes)
- `src/services/` — Business logic layer
- `src/services/bot/` — Bot adapter layer (WhatsApp, LINE adapters, message handler, session management)
- `src/services/bot/flow/` — CMS-managed flow engine (DB-driven conversation flows)
- `src/services/ai/chat.service.ts` — Free chat response generation with intent guard
- `src/lib/` — Infrastructure (DB, external APIs, utils)
- `src/lib/utils/crypto.ts` — HMAC signature verification for webhook security
- `src/types/` — Shared TypeScript types
- `src/components/` — React components (admin CMS)
- `src/app/api/webhooks/` — Webhook endpoints for WhatsApp and LINE
- `src/app/start/` — QR/short link landing page

## Architecture Decision Records (ADR)
| Decision | Reason | Alternatives | Date |
|----------|--------|-------------|------|
| Monolithic Next.js | 1인 개발, 인프라 최소화 | Turborepo monorepo, NestJS backend | 2026-08-04 |
| Neon Postgres | Vercel 통합, 서버리스 | Supabase, PlanetScale | 2026-08-04 |
| Groq + Together AI | 비용 $5-15/월 vs OpenAI $150-300/월 | OpenAI, self-hosted | 2026-08-04 |
| Drizzle ORM | 타입 안전, 경량, 서버리스 친화 | Prisma, Kysely | 2026-08-04 |
| BotAdapter Pattern | 메신저 확장성 (WeChat, Telegram 추가 시 어댑터 하나만 구현) | 메신저별 직접 구현 | 2026-08-04 |
| CMS-Managed Flows | 코드 배포 없이 봇 대화 흐름 수정 | 하드코딩 플로우, 설정 파일 | 2026-08-04 |
| HMAC Webhook Verification | 웹훅 보안 (위변조 방지) | IP 화이트리스트 | 2026-08-04 |

## Invariants (Must Not Change)
- BotAdapter 인터페이스 (메신저 확장성)
- LLMProvider 인터페이스 (AI provider 교체 가능성)
- JSONB 다국어 데이터 형식
