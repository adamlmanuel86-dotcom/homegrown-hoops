---
name: Arcade section architecture
description: How arcade mini-games are structured — HTML games in public/, React iframe wrappers, postMessage API bridge
---

## Pattern

Static HTML games live in `artifacts/homegrown-hoops/public/games/<game>.html`.
React wrapper pages (`src/pages/<game>.tsx`) load the HTML in a full-screen iframe.
At game over, the HTML game calls `window.parent.postMessage({ type: 'GAME_OVER', score, bestStreak, roundsPlayed }, '*')`.
The React wrapper listens and POSTs to `/api/arcade/sessions` using the Clerk auth token.

**Why:** Phaser/canvas games can't be written as React components without a full rewrite. The iframe pattern isolates the game from the React tree and allows score saving via postMessage without touching the game code.

**How to apply:** Any new game follows this pattern. The game HTML file adds the postMessage at game-over; the React page handles auth + API save.

## Routes
- `/arcade` — hub page with 4 game tiles
- `/arcade/fast-break` — Fast Break! Phaser platformer
- `/arcade/who-ya-got` — NBA higher/lower (pure React, no iframe)
- `/arcade/shot-clock` — Shot Clock timing game (iframe)
- `/my-avatar` — Avatar creator, auth-gated
