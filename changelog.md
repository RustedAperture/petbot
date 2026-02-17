## v8.2.3 - Feb 17, 2026

### Enhancement

- Update node version from 20 to 25

## v8.2.2 - Feb 17, 2026

### Enhancements

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
