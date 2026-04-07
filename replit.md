# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite (trading-dashboard artifact)

## Artifacts

### trading-dashboard (React + Vite)
Smart Forex Trading Analysis Dashboard — decision-support tool for Smart Money Concept traders.
- **Preview path**: `/`
- **Pages**: Dashboard, All Signals, Signal Detail, Live Analyze, Manual Signal
- **Features**: Support/Resistance detection, Order Block detection, BOS/CHoCH structure, confidence scoring (0-100), Entry/SL/TP signals

### api-server (Express)
- **Preview path**: `/api`
- **Routes**: `/api/signals`, `/api/signals/analyze`, `/api/signals/dashboard-summary`, `/api/pairs`
- Analysis engine: generates Smart Money Concept analysis for any forex pair + timeframe

## Database Schema

### signals
| Column | Type | Notes |
|--------|------|-------|
| id | serial | PK |
| pair | text | e.g. EURUSD |
| signal | enum(BUY, SELL) | |
| timeframe | text | M15, H1, H4, D1 |
| entry | real | entry price |
| stop_loss | real | |
| take_profit | real | |
| confidence_score | integer | 0-100 |
| reasons | text[] | explanation array |
| structure_type | enum(BOS, CHOCH, NONE) | |
| trend | enum(BULLISH, BEARISH, NEUTRAL) | |
| has_order_block | boolean | |
| has_support_resistance | boolean | |
| risk_reward_ratio | real | |
| status | enum(ACTIVE, HIT_TP, HIT_SL, EXPIRED) | |
| created_at | timestamp | |

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
