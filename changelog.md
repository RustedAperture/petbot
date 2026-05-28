## v8.6.2 - May 27, 2026

### Fixes

- Fixed bot login crash caused by undici v8 incompatibility with discord.js. Pinned undici to `^7.25.0`.
- Fixed deprecation warning: renamed `ready` event to `ClientReady` for discord.js v15 compatibility.

### Dependencies

- Pinned undici to `^7.25.0` (discord.js compatibility).
- Updated transitive deps: qs (6.15.2), postcss (8.5.10+), ws (8.20.1).

## v8.6.1 - May 27, 2026

### Security

- Removed hardcoded `DEV_SESSION_COOKIE_SECRET` from web app — resolves bearer scan CRITICAL finding (CWE-798). Now reads only from env vars.

### Under the Hood

**Workspace Restructuring**

- Removed stale `apps/web/package-lock.json` — root lockfile is the single source of truth for npm workspaces.
- Updated CI workflow: removed redundant `npm ci --prefix apps/web` step.
- Updated publish workflow: removed paths filter blocking tag-triggered Docker builds; switched to root `npm ci` in build-web job.
- Fixed Dockerfile web-builder stage: uses root `npm ci` with post-install to populate workspace `node_modules`.
- Fixed Next.js build cache key to no longer reference deleted lockfile.

**Developer Experience**

- Fixed pre-commit hook to handle deleted files gracefully.
- Added `INTERNAL_API_SECRET` to web test environment setup.
- Fixed test env pollution: tests no longer leave env vars modified.

## v8.6.0 - Apr 07, 2026

### What You'll Notice

- New server settings page in the web dashboard for managing bot configuration
- Server settings can now be updated directly from the dashboard
- Improved error messages and validation on the admin settings form
- User stats selector uses a cleaner dropdown format
- Security improvements to the website and API

### Under the Hood

**HTTP Server Migration**

- Migrated the HTTP API from raw Node.js http to Express 5
- All API routes converted to Express with RESTful URL patterns
- Added Helmet middleware for secure HTTP headers
- Disabled X-Powered-By header to reduce server fingerprinting
- Sensitive error details hidden in production 500 responses

**Refactoring**

- Created shared utility modules for authentication, proxy requests, error handling, and URL building
- Refactored guilds, stats, auth, opt-out, and server settings routes to use shared helpers, eliminating significant code duplication
- Improved TypeScript type safety across response types and hooks
- Enhanced useGuildSettings and useServerSettings hooks with better error handling, cache management, and explicit field clearing

**Testing**

- Set up Vitest and happy-dom testing infrastructure in apps/web
- Consolidated all frontend tests into apps/web/tests/ mirroring the source directory
- Added tests for guilds, stats, user routes, server settings API, bot data functions, and UI components
- Updated test mocks for SWR, session hooks, and sidebar state for more reliable runs

**Developer Experience**

- Pre-commit hook now auto-fixes linting issues and re-checks before committing
- Upgraded to Vite 8.0.7 with native tsconfigPaths support
- Removed unused dependencies and eliminated frontend-only packages from root to fix npm hoisting issues

**Dependencies**

- Upgraded express to v5.2.1
- Upgraded helmet to v8.1.0
- Upgraded vite to v8.0.7
- Upgraded vitest to v4.1.3
- Various dependency updates across root and web packages

## v8.5.0 - Mar 17, 2026

### Enhancements

- Rework the `/server-setup` command to use a modal
- Add a new `/server-set` command specifically for the images

### New Features

- Add a restricted option to server setup, when enabled it will allow for the server to only use the default or server set images

## v8.4.0 - Mar 13, 2026

### Enhancement

- Added how to support text to the homepage of the website
- Update website styling
  - Change the theme colors
  - Update design of the changelog page
- Mobile sidebar now automatically collapses after selecting a menu item (improves navigation on phones).

### New Features

- Add ability to see your images in the user stats section. images are shown in a carousel on the user stats page when viewing a specific guild.
- Add Ability to set your images in the user stats section

## v8.3.0 - Mar 07, 2026

### New Features

- Added option for GDPR data deletions in the user settings page
- Added an option to opt out of interactions via the user settings
- Added a very basic privacy policy
- Added a very basic terms of service

### Enhancements

- Update wording on homepage to be login aware
- Fix bug in user stats that was showing the guild ID instead of the name

## v8.2.5 - Feb 22, 2026

### New Features

- Add Changelog to the website, clicking on the version in the sidebar now opens a changelog modal

## v8.2.4 - Feb 17, 2026

### Enhancements (under the hood)

- Refactor code to use drizzle ORM (speed up deployment by allowing use of libsql)

## v8.2.3 - Feb 17, 2026

### Enhancements (under the hood)

- Update node version from 20 to 24

## v8.2.2 - Feb 17, 2026

### Enhancements (under the hood)

- Split Dockerfile into separate build stages and targets for bot and web images
- Created separate entrypoint scripts for bot and web containers
- Updated GitHub Actions workflows to build and publish both images separately
- Updated docker-compose.yml to use the new split images with proper service configuration
- Updated readme.md with new build and run instructions for both images

## v8.2.0 - Feb 16, 2026

### New Features

- Add userScoped semantics end-to-end (web hook/query params → Next.js /api/stats proxy behavior → backend /api/stats handler logic) plus new tests for proxy behavior.

### Enhancements

- Refresh dashboard UX (header selectors for guild/DM/user scope, new user stats selector) and switch theming to next-themes.

### Fixes

- Tooling/maintenance updates: TypeScript ESLint unused-vars rule, Husky pre-commit hook, dependency bumps, and widespread formatting/unused-var cleanup.

## v8.1.4 - Feb 16, 2026

### Fixes

- Fixed a bug preventing some users from logging in

## Special Thanks

- Zimbi (Default Images)
- Ace (Bug Report)
