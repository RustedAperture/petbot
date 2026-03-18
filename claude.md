# Claude Guidance for petbot

## Project overview

- **Language:** TypeScript (ESM)
- **Runtime:** Node.js (>=24)
- **Core components:**
  - **Bot / backend:** `src/` (Discord bot logic, database, commands, events)
  - **Frontend / web app:** `apps/web/` (Next.js / React UI)
- **Database:** Drizzle ORM + migrations are under `drizzle/`

## Testing (Vite / Vitest)

- All tests are run via **Vitest** (powered by Vite).
- Run tests from the repo root:
  - `npm test` – run all tests once (CI-friendly)
  - `npm run test:watch` – run tests in watch mode

> ✅ **Test runner should always be assumed to be Vite/Vitest**, not Jest/Mocha/etc.

## Key scripts (from `package.json`)

- `npm run dev` — build server typescript then start the bot (uses `tsc` + node)
- `npm run dev:web` — run the frontend in dev mode (`apps/web`)
- `npm run build` — build both web and server output
- `npm run lint` — run ESLint across the repo
- `npm run format` — run Prettier on JS/JSON/MD files

## Important folders

- `src/` — bot and backend implementation (commands, events, db, http server)
- `apps/web/` — frontend UI (Next.js, components, hooks, etc.)
- `drizzle/` — database migrations and schema definitions
- `tests/` — test suites for bot logic and components

## Notes for contributors

- Keep TypeScript types strict; this repo uses `tsconfig.server.json` for the bot and `apps/web/tsconfig.json` for the frontend.
- The bot is intended to run on Node; do not assume browser globals.
- **Always add or update tests for new behavior and bug fixes.** Follow the existing Vitest patterns in `tests/`.

---

If you need a quick reminder of how to run the bot or the web UI, search for `scripts` in `package.json`.
