---
name: verify
description: Build, launch, and drive Atlasly (React/Vite client + Express/Postgres server) to verify changes end-to-end in a real browser.
---

# Verifying Atlasly

## Launch

Postgres must be running locally (`pg_isready`); connection string in `server/.env`.

```bash
cd server && node index.js &        # port 3001; auto-creates/migrates schema on boot
cd client && npx vite &             # port 5173; proxies /api and /uploads to :3001
curl -s http://localhost:3001/health
curl -s -o /dev/null -w '%{http_code}' http://localhost:5173/
```

## Drive

- API-level smoke: register via `POST /api/auth/register` (password needs upper/lower/digit/special, e.g. `Password123!`), then use the returned Bearer token for `/api/trips`, `/api/trips/:id/items`, `/api/photos/:itemId` (multipart field `photo`), `/api/places/search?query=...` (proxies Nominatim — needs internet).
- Browser-level: install Playwright in the scratchpad (`npm i playwright && npx playwright install chromium`) and drive http://localhost:5173. A working script covering register → create trip → place search → map pin drop → photo upload → playback lives in the session that created this skill; key selectors: registration inputs by id (`#username`, `#email`), map is `.leaflet-container`, playback overlay is triggered by the "Play Trip" button.

## Gotchas

- pg returns `DECIMAL` columns (latitude/longitude, cost) as **strings** — any client arithmetic must parseFloat first; string coords caused an `Invalid LatLng (NaN, NaN)` crash in playback once already.
- Playback timings: 6s dwell per stop, ~3s travel leg (`client/src/components/TripPlayback.jsx`); a 2-stop trip takes ~20s to reach the finale card.
- Pre-existing test failures unrelated to app behavior: 5 in client suite (PrivateRoute mock uses `require` under ESM), 2 in server suite. Don't treat these as regressions.
- Fun facts (`/api/places/funfact`) use Claude (`claude-opus-4-8`) when `ANTHROPIC_API_KEY` is set in `server/.env`, else fall back to plain Wikipedia summaries (`generated: false` in the response). To test the Claude path without a real key, run a local Messages API stub and start the server with `ANTHROPIC_API_KEY=stub ANTHROPIC_BASE_URL=http://localhost:<port>`.
