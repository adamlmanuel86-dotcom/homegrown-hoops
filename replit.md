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

- Homepage with league stats summary and stat leaders (PPG / RPG / APG only — steals/blocks removed)
- Teams list + team detail (roster, W/L record, team stats)
- Players list (search + filter by team) + player detail (career averages, shooting %)
- Games log (filter by team/season) + game detail with full box score
- Admin stat entry: admins see "Player Stats" panel on game detail pages with inline PTS/REB/AST inputs per player. Saving triggers the recognition engine (stamps, tides, archetypes).
- Recognition engine (`artifacts/api-server/src/recognition.ts`): recalculates stamps (all-time per-game badges), tides (current season leader titles), and archetypes (team-based roles) after every stat save.
- Recognition frontend (`artifacts/homegrown-hoops/src/components/recognition.tsx`): 8 stamps, 6 tides, 7 archetypes with icons, descriptions, and rarity colors. "Shift Worker" stamp removed.
- Clerk authentication (sign in / sign up)
- User profile system: signed-in users can create/edit their profile (name, school, position, graduation year, bio); profiles are publicly viewable at `/profiles/:clerkUserId`; only the owner or an admin can edit
- Three-tier role system: admin, coach, player (default). First account to register is auto-promoted to admin. Admins see an "Admin" link in the nav leading to `/admin` panel where they can change any user's role.
- Cloudinary video upload for game highlights (manual upload only — no auto highlight generation).

## Database Schema

Tables: `teams`, `players`, `games`, `game_player_stats`, `user_profiles`
- `user_profiles`: clerkUserId (unique), firstName, lastName, school, position, graduationYear, bio, isAdmin (bool), role ('admin'|'coach'|'player', default 'player'), stamps (json, permanent), tides (json `{id, earnedAt, season?}[]`), archetype (text, current season), careerStats (json, accumulated totals from completed seasons), archetypeHistory (json, per-season archetype record)
- First account to register automatically gets role='admin' and isAdmin=true
- Role changes done via admin panel UI (PATCH /api/admin/users/:clerkUserId/role)
- `careerStats` is snapshotted during New Season Reset — stores cumulative games/pts/reb/ast/stl/blk/3pm from all completed seasons so Legacy Score never decreases
- `archetypeHistory` stores the archetype assigned at season end (written during reset) for season history view

## Season Reset Rules

`resetTeamSeason` (admin action):
- **RESETS**: current season tides (cleared), current season archetype (→ "Uncharted"), current season game_player_stats (deleted)
- **PRESERVES**: stamps (permanent career achievements, never recalculated), careerStats (snapshot added before deletion), Legacy Score (computed from careerStats + live stats)
- **SAVES**: archetype for the closing season into archetypeHistory before resetting to Uncharted

## Season History (Player Profiles)

- Profile pages have a season selector dropdown (appears when player has historical data)
- Selecting a past season shows: season-specific stats, tides filtered by season tag, archetype from archetypeHistory
- Career Legacy Score and all stamps always show regardless of selected season
- `GET /api/players/:id/seasons` — returns distinct seasons the player has game data for
- `GET /api/players/:id/stats?season=X` — returns stats for that season only (no season param = all seasons)

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
