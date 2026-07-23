---
name: AvatarConfig frontend type
description: AvatarConfig type lives in avatarCanvas.ts — NOT imported from @workspace/db — because the frontend can't import server packages
---

## Rule

`AvatarConfig` is exported from `artifacts/homegrown-hoops/src/lib/avatarCanvas.ts`.
Frontend components (AvatarCreator, AvatarDisplay, my-avatar page) import it from `@/lib/avatarCanvas`.

**Why:** `@workspace/db` is a server-only package with PostgreSQL/Drizzle deps. Vite would fail at build time trying to bundle pg/drizzle.

**How to apply:** If you need AvatarConfig in any frontend file, import `type AvatarConfig from "@/lib/avatarCanvas"`. The db schema in `lib/db/src/schema/userProfiles.ts` defines its own identical type independently.
