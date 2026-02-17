# Petbot

A Discord bot by RustedAperture.

---

## Setup

**NOTE:** This bot is self-hosted. It supports multiple guilds but requires you to run it.

### Local (development)

1. Create a `.env` file in the project root (or set environment variables):

```
DISCORD_TOKEN=
DISCORD_CLIENT_ID=
DEFAULT_GUILD_ID=   # optional
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

(You can also provide these via Docker environment variables; legacy `config.json` support remains temporarily but is deprecated.)

2. Install deps and run in dev mode:

```bash
npm install
# run the bot backend
npm run dev
# run the web UI (in a separate shell)
npm run dev:web
```

3. Use `/setup` in a guild channel to configure the bot. The web UI will be available at `http://localhost:3000` when `npm run dev:web` is running.

---

## Docker (recommended for production)

We provide a production-ready **multi-stage Dockerfile** and a GitHub Action that can push multi-arch images to GHCR.

### Build & run locally

- Build locally (tested):

```bash
# Build bot-only image (sqlite3 will be rebuilt)
docker build --target bot -t petbot-bot:local .

# Build web-only image
docker build --target web -t petbot-web:local .
```

- Run with mounted data & config (web UI exposed on port 3000) using docker-compose:

```bash
# start both services (uses local images if tagged appropriately)
docker compose up --build
```

Or run a single service directly:

```bash
# Run bot container (internal API on 3001)
docker run --rm --name petbot-bot -v "$(pwd)/data":/home/node/app/data -e DISCORD_TOKEN="$DISCORD_TOKEN" petbot-bot:local

# Run web container (serves UI on 3000)
docker run --rm --name petbot-web -p 3000:3000 -v "$(pwd)/data":/home/node/app/data -e NEXT_PUBLIC_SITE_URL="http://localhost:3000" petbot-web:local
```

After the containers start, open `http://localhost:3000` to access the web UI.

> The image's `entrypoint` script ensures `data/` permissions and will warn if required environment variables are not set.

### Pulling the published image

We publish multi-arch images to GHCR. Example (replace `<owner>`):

```bash
docker pull ghcr.io/<owner>/petbot:latest
```

Or pull a semver-tagged release:

```bash
docker pull ghcr.io/<owner>/petbot:1.2.3
```

If you want to run on Unraid, map `./data` and set the required environment variables (do not commit secrets). Legacy `config.json` mounting is supported temporarily but using env vars is recommended.

---

## CI / Publishing

- CI switched from `pnpm` to `npm` (uses `npm ci` for reproducible installs).
- **Publish workflow:** `.github/workflows/publish-ghcr.yml` builds and pushes multi-arch images (amd64 & arm64) to **GHCR**.
- **Token:** workflow prefers a `CR_PAT` repo secret (falls back to `GITHUB_TOKEN`). If you want an explicit PAT create one with **Packages: write** and add it as `CR_PAT` in repo secrets.

---

## Build artifact (`dist`) vs bundling

This project uses TypeScript and compiles to `dist/` using `tsc` (the Dockerfile copies compiled files into the runtime image). Alternatives are possible (e.g., bundling with `esbuild`/`tsup`) but `dist/` is simple and reliable for Node services.

If you prefer a single-file bundle for smaller images, I can convert the build to `esbuild` and update the Dockerfile.

---

## Notes / Troubleshooting

### Discord OAuth (web UI)

To enable "Sign in with Discord" for the web UI you must set the following environment variables for the `apps/web` Next app (development: use your shell or `.env`):

- `DISCORD_CLIENT_ID` — OAuth application client id
- `DISCORD_CLIENT_SECRET` — OAuth application client secret
- `NEXT_PUBLIC_SITE_URL` — public URL for the site (defaults to `http://localhost:3000` in dev)

Security: the OAuth flow now generates a cryptographically-random `state` value and stores it in a short-lived HttpOnly cookie; the callback validates that `state` to protect against CSRF/session-fixation.

Register a Discord OAuth application and configure its redirect URI to: `https://<your-site>/api/auth/discord/callback` (or `http://localhost:3000/api/auth/discord/callback` for local dev).

## Notes / Troubleshooting

- The web UI is served by Next.js at port `3000` when running via `npm run dev:web` or the container.
- If sqlite3 or other native modules fail, ensure you build the image on the target architecture or use multi-arch images (we publish `linux/amd64` and `linux/arm64`). The Dockerfile now forces `sqlite3` to be built from source during image builds so cross-architecture Docker Buildx runs won't attempt to download incompatible prebuilt binaries.
- The Dockerfile installs build deps in the builder stage so native modules are compiled for the image.
- If you are upgrading from an older version, run the new migration `11_migrate_legacy_defaults` to copy legacy per-action default image fields (e.g., `default_pet_image`, `default_bite_image`) into the newer `default_images` JSON map. This preserves existing guild defaults and prefers the JSON map for future lookups.

---

## Image security / SSRF protections 🔒

The bot validates user-provided image URLs to reduce SSRF and network-probing risks.

**Key behaviors:**

- Only `http` and `https` schemes are accepted.
- Hosts that resolve to private or loopback addresses (e.g., `127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, IPv6 `::1`, `fe80::/10`, `fc00::/7`) are blocked by default.
- Requests use a short timeout (5s) and **do not** follow redirects.
- Optionally restrict allowed hosts with **`ALLOWED_IMAGE_HOSTS`** (a comma-separated list of hostnames). Subdomains are allowed (e.g., `cdn.example.com` matches `example.com`).

**HTTP API access (internal-only by default)**

- The bot's HTTP API (default port `3001`) is intended to be accessed only by the local Next.js frontend—it is **bound to localhost by default** so external callers cannot reach it.
- Environment variables:
  - `HTTP_HOST` — host/interface the API server binds to (defaults to `127.0.0.1`).
  - `HTTP_PORT` — port the API listens on (defaults to `3001`).
  - `INTERNAL_API_SECRET` — optional secret; when set, callers must include `x-internal-api-key: <secret>` on requests.
- Recommended deployment: expose **only** port `3000` (Next.js) to the public internet and keep the bot API internal/private.

**Security guidance:**

- **Do not** bind the API to a public interface in production unless you have a strong reason and you protect it (e.g., with `INTERNAL_API_SECRET` and firewall rules).
- If running in containers, use a private Docker network or host networking so only the Next.js container can reach the bot API.

**Examples (do not commit these files/values into source control):**

- Docker run:

```bash
docker run -e ALLOWED_IMAGE_HOSTS='example.com,images.example.net' ...
```

- Docker Compose override (create `docker-compose.override.yml` and keep it out of version control):

```yaml
services:
  petbot:
    environment:
      - ALLOWED_IMAGE_HOSTS=example.com,images.example.net
```

If you want stricter controls, consider enforcing an allowlist in production and/or adding monitoring for blocked attempts.

---

If you want, I can add a short **Usage** section with example `docker-compose.yml` for Unraid and commit it to this PR.
