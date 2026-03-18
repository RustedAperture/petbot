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
