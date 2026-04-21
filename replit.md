# Homegrown Hoops

## Overview

Mobile-friendly basketball stats tracking website for community/neighborhood leagues. Full-stack React+Vite frontend with Express API backend and PostgreSQL database.

## Project Structure

- `artifacts/homegrown-hoops/` — React+Vite frontend (neobrutalist design, orange #FF5722, Anton font)
- `artifacts/api-server/` — Express 5 API server with Clerk auth middleware
- `lib/db/` — Drizzle ORM schemas & database client
- `lib/api-spec/` — OpenAPI spec (source of truth for API)
- `lib/api-zod/` — Generated Zod schemas from OpenAPI
- `lib/api-client-react/` — Generated React Query hooks from OpenAPI

## Features

- Homepage with league stats summary and stat leaders
- Teams list + team detail (roster, W/L record, team stats)
- Players list (search + filter by team) + player detail (career averages, shooting %)
- Games log (filter by team/season) + game detail with full box score
- Clerk authentication (sign in / sign up)
- User profile system: signed-in users can create/edit their profile (name, school, position, graduation year, bio); profiles are publicly viewable at `/profiles/:clerkUserId`; only the owner or an admin can edit
- Three-tier role system: admin, coach, player (default). First account to register is auto-promoted to admin. Admins see an "Admin" link in the nav leading to `/admin` panel where they can change any user's role.

## Database Schema

Tables: `teams`, `players`, `games`, `game_player_stats`, `user_profiles`
- `user_profiles`: clerkUserId (unique), firstName, lastName, school, position, graduationYear, bio, isAdmin (bool), role ('admin'|'coach'|'player', default 'player')
- First account to register automatically gets role='admin' and isAdmin=true
- Role changes done via admin panel UI (PATCH /api/admin/users/:clerkUserId/role)

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite + Tailwind CSS v4 + wouter routing
- **Auth**: Clerk (whitelabel)
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec → React Query hooks + Zod)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Design Notes

- Neobrutalism: thick black borders, `shadow-[6px_6px_0_0_rgba(0,0,0,1)]`, no border-radius
- Primary color: `hsl(15, 100%, 50%)` (deep orange)
- Fonts: Anton (display/headings), Inter (body)
- All dates serialized as ISO strings via `serializeRow`/`serializeRows` in `artifacts/api-server/src/lib/serialize.ts`
- `lib/api-zod/src/index.ts` exports ONLY `./generated/api` (not `./generated/types`) to avoid duplicate identifier errors
