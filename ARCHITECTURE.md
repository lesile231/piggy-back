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
