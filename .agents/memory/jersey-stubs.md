---
name: Jersey stub system
description: How unregistered jersey-number players are tracked and later claimed by a real user account
---

## The rule
When a manager types `#14` (or any `#\d+`) as a player name during game tracking, the backend creates a **jersey stub** — a `players` row with `isJerseyStub=true`, `firstName="#14"`, `number="14"`, and a `jersey_stubs` join row with `(jerseyNumber, teamId, season)` unique key.

## Claiming
`POST /admin/users/:clerkUserId/claim-jersey` with `{jerseyNumber, teamId, season}`:
1. Looks up the `jersey_stubs` row (must be unclaimed)
2. Updates the stub player: `firstName=user.firstName, lastName=user.lastName, isJerseyStub=false`
3. Sets `jersey_stubs.claimedByClerkUserId`
4. Calls `recalculateStampsForPlayer(stub.playerId)` — recognition fires because the player name now matches the user profile

**Why:** Recognition engine links players→profiles via firstName+lastName match (`findProfileByName`). Updating the player name to the real user's name is all that's needed — no special recognition hook required.

## Frontend
- `isJerseyStub=true` players in box scores render as non-clickable span (no profile link)
- Track-game add-player input shows "Jersey stub — stats tracked, no profile" hint when `#\d+` pattern detected
- Admin User Management has "Claim #" button per user → drawer with unclaimed stub picker + manual form
