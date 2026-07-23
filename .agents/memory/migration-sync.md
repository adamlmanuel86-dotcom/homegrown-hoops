---
name: Migration script sync with Drizzle schema
description: Every new column added to the Drizzle schema must also appear in migrate.ts addCol() or Railway crashes with 500
---

Every time a new column is added to any schema file in `lib/db/src/schema/`, it MUST also be added as an idempotent `addCol()` call in `artifacts/api-server/src/lib/migrate.ts`.

The migration runs on server startup. If the column is missing from `addCol()`, Drizzle's `db.select()` generates SQL referencing that column, which causes `column X does not exist` on Railway → HTTP 500 on every route that queries that table.

**Why:** Railway's production DB is not created fresh — it has the table from the original CREATE TABLE but misses columns added later. The `CREATE TABLE IF NOT EXISTS` block only runs once (skips if table exists). The `addCol()` section is the only thing that updates existing tables.

**How to apply:** After adding any column to a schema file, immediately add the corresponding line to the `addCol` block in `migrate.ts`:
```typescript
await addCol("table_name", "column_name", "SQL_TYPE DEFAULT value");
```

The bug that prompted this: `avatarConfig: jsonb("avatar_config")` was added to `userProfiles.ts` without a matching `addCol()`. This caused `GET /api/profiles`, `GET /api/profiles/me`, `POST /api/profiles/me`, and `PATCH /api/profiles/me` to all return 500 on Railway, breaking the Players page and all profile operations.
