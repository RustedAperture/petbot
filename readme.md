# Petbot

A Discord bot by RustedAperture.

---

## Setup

**NOTE:** This bot is self-hosted. It supports multiple guilds but requires you to run it.

### Local (development)

1. Create `config.json` in the project root:

```json
{
  "token": "",
  "clientId": "",
  "guildId": ""
}
```

2. Install deps and run in dev mode:

```bash
npm install
npm run dev
```

3. Use `/setup` in a guild channel to configure the bot.

---

## Docker (development-first / default)

This project now uses a development-focused container as the default and preferred way to run the bot locally and for day-to-day development. The repository's `Dockerfile` builds an image that runs both the bot and the web dev server concurrently (suitable for local development). Production-style multi-arch images may still be available via GHCR for CI/publishing workflows but **local development should use the container**.

### Run locally (recommended)

- Build and run using docker compose (this uses the repo `Dockerfile` which runs in dev mode by default):

```bash
docker compose up --build
```

- The container mounts the repository so changes are reflected immediately. The Next.js dev server is exposed on port `3000` by default and you can access it at `http://localhost:3000`.

- The internal bot API remains bound to loopback by default (`127.0.0.1`) and is intentionally not published to the host.

### Notes

- To enable the interactive TUI (requires a TTY) set `TUI=1` in the environment or run with `-it`.
- The container entrypoint will run both the bot (root `npm run dev`) and the web dev server (`web npm run dev`) when running in dev mode.
- If you need a production-style image (for releases), see CI / Publishing; note that local development is still intended to be performed with the dev-first container.

> If you'd like, I can add an example `docker compose` snippet tailored for Unraid or add a short `DEVELOPING.md` section with tips (watchers, nodemon, etc.).

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

- The TUI (Ink) requires a TTY — run with `-it` for interactive mode.
- If sqlite3 or other native modules fail, ensure you build the image on the target architecture or use multi-arch images (we publish `linux/amd64` and `linux/arm64`).
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

**Security guidance:**

- **Do not** commit an `ALLOWED_IMAGE_HOSTS` value or concrete host lists to your repository or a checked-in `docker-compose.yml`.
- Prefer setting it via environment variables in your deployment platform, or in a non-committed override file (examples below).

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
