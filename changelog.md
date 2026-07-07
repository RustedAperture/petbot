## v8.8.1 - Jul 06, 2026

### Fixes

- Fixed the "Set everywhere" option not working when editing images from the website.
- Fixed guild default images being permanently locked in the first time a user used a command, so admins updating the default via `/server-set` or the website never affected anyone who had already used the bot. New users now always get the current default automatically; if you already have an image set, run `/reset` once to pick it up too — after that, future default changes will keep applying automatically without needing `/reset` again.

## v8.8.0 - Jun 02, 2026

### What You'll Notice

- **New User Stats Chart:** Added a new grouped horizontal bar chart to the user stats page, letting you directly compare how many actions you've performed vs. how many you've received.
- **Redesigned Distribution Chart:** The global and guild action distribution chart is now a sleek radial ring chart with log-scaling to visualize highly skewed data.
- **Dashboard Layout Polish:** Reorganized the stats dashboards by moving the distribution chart into the right-hand sidebar above the leaderboard.
- Reduced the leaderboard size from Top 15 to Top 10.
- Improved gradient matching and UI sizing across all stats components.

### Under the Hood

- **API Updates:** The `/api/stats` backend route now properly aggregates and returns both `totalHasPerformed` and `totalHasReceived` from the database.
- Chart components have been refactored to consume the new dual-aggregation data format.

### Fixes

- Fixed the GitHub link button on the homepage being invisible in light mode by improving its contrast and adding a subtle border.

## v8.7.0 - May 28, 2026

### What You'll Notice

- Added leaderboards to the web dashboard, showing top users by action count on global, guild, and DM stats pages.
- Added a `/leaderboard` Discord slash command.
- Hovering an action card on the global stats page filters the leaderboard to that action.
- Added a leaderboard display name setting — choose to show your name instead of appearing anonymous. Defaults to your Discord username.
- Current user is highlighted with an amber tint on the leaderboard.
- Leaderboard shows up to 15 entries.
- Stats cards have a cleaner footer layout.

### Under the Hood

- Added `leaderboardConsent` table for storing display name consent against hashed user IDs, keeping raw Discord IDs and display names in separate tables.
- Leaderboard consent CRUD follows the existing opt-out pattern (Express route + Next.js proxy + React hook).
- Extracted shared `hashUserId` utility for consistent hashing.
- Global stats page uses a responsive grid layout so the leaderboard reflows below stats on smaller screens.
- Migrated leaderboard to shadcn Card components.
- Anonymous user labels now show 6 hex characters instead of 4.
- Comprehensive tests for leaderboard backend, frontend, consent routes, and hooks.

## v8.6.3 - May 27, 2026

### Fixes

- Fixed sign-in not working after the session cookie security improvements.
- Fixed some navigation links not being clickable.

## v8.6.2 - May 27, 2026

### Fixes

- Fixed bot login crash on startup.
- Fixed deprecation warning for the ready event.

## v8.6.1 - May 27, 2026

### Security

- Fixed a critical security finding from the Bearer security scanner.

### Under the Hood

- Fixed CI, Docker build, and deployment workflows for the new npm workspace setup.
- Fixed the pre-commit hook to handle deleted files.
- Improved test reliability by adding proper environment setup.
- Various dependency updates.

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
- Kitsii (Bug Report)
