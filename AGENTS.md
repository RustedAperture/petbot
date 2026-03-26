# AGENTS.md — PetBot Repository Guide

## Project Overview

PetBot is a Discord bot with an Express HTTP API and a Next.js web dashboard.
The repo is a monorepo: **root** (bot + API) and **apps/web** (Next.js 16 frontend).

- **Runtime**: Node.js 24 (ESM — `"type": "module"`)
- **Language**: TypeScript (strict mode, `NodeNext` module resolution)
- **Database**: Drizzle ORM + Turso (libSQL) — schema at `src/db/schema.ts`
- **Bot framework**: discord.js v14
- **HTTP server**: Express v5 with Helmet security headers
- **Logging**: Pino (JSON to `app.json.log` + pretty stdout)

## Build / Lint / Test Commands

```bash
# Build
npm run build            # server + web
npm run build:server     # TypeScript compile only (tsc -p tsconfig.server.json)
npm run build:web        # Next.js build (apps/web)

# Lint & Format
npm run lint             # ESLint (root + apps/web ignored — has own config)
npm run lint:fix         # ESLint --fix
npm run format           # Prettier --write
npm run format:check     # Prettier --check

# Test (Vitest)
npm test                 # run all server tests once
npm run test:ci          # run server tests (silent, for CI)
npm run test:watch       # watch mode
npm run test:web         # run web tests (apps/web)
npm run test:web:ci      # run web tests (silent)

# Run a single test file
npx vitest --run tests/commands/pet.test.ts
npx vitest --run tests/http/routes/health.test.ts

# Run tests matching a name pattern
npx vitest --run -t "performs action"

# Database migrations
npm run migrate:drizzle        # apply pending migrations
npm run migrate:drizzle:status # show migration status
```

## Project Structure

```
src/
  commands/slash/     # Discord slash commands (each exports { data, execute })
  commands/context/   # Discord context-menu commands
  components/         # Discord UI builders (ContainerBuilder replies)
  db/                 # Drizzle schema, connector, bootstrap, functions
  events/             # Discord client event handlers
  http/               # Express server, middleware, API routes, adapters
  types/              # Shared TypeScript types and constants
  utilities/          # Helpers (actionHelpers, check_user, crypto, etc.)
  config.ts           # Environment config loader
  logger.ts           # Pino logger setup
tests/                  # Server-side tests (Vitest, node environment)
  helpers/              # Shared test utilities (mockInteraction.ts)
  commands/             # Command tests (mirror src/commands/)
  http/                 # HTTP route/middleware tests
  db/                   # Database function tests
  utilities/            # Utility function tests
apps/web/               # Next.js 16 frontend (separate package.json)
  tests/                # Frontend tests (Vitest, happy-dom environment)
    __mocks__/          # Module mocks
    app/                # Page/route tests (*.test.tsx)
    components/         # Component tests (*.test.tsx)
    hooks/              # React hook tests (*.test.ts)
    lib/                # Utility tests (*.test.ts)
    setup-tests.ts      # Test setup (imported before each file)
```

## Code Style Guidelines

### Imports

- Use **ESM** with `.js` extensions: `import { foo } from "./bar.js"`
- Node builtins use `node:` prefix: `import fs from "node:fs"`
- Use **path aliases** (defined in tsconfig.json + vite.config.ts):
  - `@utils/*` → `src/utilities/*`
  - `@components/*` → `src/components/*`
  - `@commands/*` → `src/commands/*`
  - `@types/*` → `src/types/*`
  - `@db/*` → `src/db/*`
  - `@logger` → `src/logger.js`
- Import types with `import type { ... }` when only used as types
- Order: Node builtins → external packages → internal modules

### Formatting (Prettier + ESLint enforced)

- **Double quotes** for strings
- **2-space indentation**, no tabs
- **Semicolons** required
- **Trailing commas** in multiline (`always-multiline`)
- **1TBS brace style** (opening brace on same line)
- **No trailing spaces**
- **Object spacing**: `{ key: value }` (spaces inside braces)
- **Array spacing**: `[item]` (no spaces inside brackets)

### Naming Conventions

- **Files**: `camelCase.ts` for most files; `snake_case.ts` for some utilities (e.g., `check_user.ts`)
- **Constants**: `UPPER_SNAKE_CASE` for top-level constants (e.g., `ACTIONS`, `DISCORD_TOKEN`)
- **Types/Interfaces**: `PascalCase` (e.g., `ActionType`, `ActionUser`)
- **Functions**: `camelCase` (e.g., `performAction`, `checkUser`)
- **Discord commands**: export `command` with `{ data: SlashCommandBuilder, execute }` and `export default command`

### TypeScript

- `strict: true` is enabled, but `noImplicitAny: false` — explicit `any` is allowed
- Prefix unused variables with `_` (e.g., `_err`, `_req`, `_line`)
- Use `as` casting sparingly; prefer type guards where practical
- Enums for fixed sets: `enum HttpMethod { GET = "GET", ... }`
- `as const` for immutable object literals (e.g., `ACTIONS`, `ParseJsonErrors`)

### Error Handling

- Use `try/catch` for operations that may fail (DB inserts, file reads)
- Log errors with Pino: `logger.error({ error }, "message")`
- HTTP errors return JSON: `res.status(code).json({ error: "error_key" })`
- Global Express error handler catches unhandled errors → 500 response
- Never swallow errors silently — at minimum log with `logger.debug` or `logger.error`

### Logging

- Import logger: `import logger from "@logger"` or `import logger from "../logger.js"`
- Levels: `logger.debug()`, `logger.info()`, `logger.warn()`, `logger.error()`
- Structured logging: `logger.error({ error }, "context message")`

### Database (Drizzle ORM)

- Import from `drizzle-orm`: `import { sql, eq, and } from "drizzle-orm"`
- Use the shared connector: `import { drizzleDb } from "../db/connector.js"`
- Schema in `src/db/schema.ts`; query with `drizzleDb.select().from(table).where(...)`
- Tests use in-memory SQLite (`file::memory:?cache=shared`)

## Testing Guidelines

### Server Tests (`tests/`)

- **Framework**: Vitest (globals enabled — `describe`, `it`, `expect`, `vi` available without import)
- **Environment**: `node`
- **Test location**: `tests/` mirrors `src/` structure
- **File naming**: `*.test.ts`
- **Mocking**: Use `vi.mock()` for module mocking, `vi.fn()` for spy/stub
- **Shared helpers**: `tests/helpers/mockInteraction.ts` for Discord interaction mocks
- **Pattern**: Arrange-Act-Assert; mock external dependencies, test behavior not implementation
- **Run single file**: `npx vitest --run tests/commands/pet.test.ts`

### Web Tests (`apps/web/tests/`)

- **Framework**: Vitest (globals enabled)
- **Environment**: `happy-dom` (DOM simulation)
- **Test location**: `apps/web/tests/` mirrors `apps/web/` structure
- **File naming**: `*.test.ts` or `*.test.tsx`
- **Setup file**: `apps/web/tests/setup-tests.ts` (imported before each test)
- **Pool**: `forks` — each test file runs in an isolated child process to prevent DOM/React state leaks
- **Path aliases**: `@/` → `apps/web/`, `@petbot/constants` → `src/types/constants`
- **Run single file**: `npx vitest --run apps/web/tests/components/stats-card/stats-card.test.tsx`

### General

- **Pre-commit**: Husky runs `npm run lint -- --fix` before each commit

## Key Patterns

- **Discord commands**: Export `{ data: SlashCommandBuilder, execute(interaction) }` + `export default command`
- **HTTP routes**: Export default handler function `(req, res)` or `(req, res, next)`
- **Legacy HTTP adapters**: Raw Node handlers wrapped with `adaptLegacy(handler)` for Express v5
- **Middleware**: Express middleware in `src/http/middleware/` (auth, requestLogger)
- **Env config**: Load from `.env` via dotenv; access via `process.env.*` or `src/config.ts` exports
