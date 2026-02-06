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

## Docker (recommended for production)

We provide a production-ready **multi-stage Dockerfile** and a GitHub Action that can push multi-arch images to GHCR.

### Build & run locally

- Build locally (tested):

```bash
docker buildx build --load --platform linux/amd64 -t petbot:local .
```

- Run with mounted data & config (TUI disabled unless you attach a TTY):

```bash
docker run --rm --name petbot \
  -v "$(pwd)/data":/home/node/app/data \
  -v "$(pwd)/config.json":/home/node/app/config.json:ro \
  -e TUI=1 petbot:local
```

- To get the interactive TUI attach a TTY:

```bash
docker run -it --rm --name petbot -v "$(pwd)/data":/home/node/app/data \
  -v "$(pwd)/config.json":/home/node/app/config.json:ro -e TUI=1 petbot:local
```

> The image's `entrypoint.sh` ensures `data/` permissions and warns if `config.json` is missing.

### Pulling the published image

We publish multi-arch images to GHCR. Example (replace `<owner>`):

```bash
docker pull ghcr.io/<owner>/petbot:latest
```

Or pull a semver-tagged release:

```bash
docker pull ghcr.io/<owner>/petbot:1.2.3
```

If you want to run on Unraid, map `./data` and `./config.json` in the container template and set any required env vars.

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

---

If you want, I can add a short **Usage** section with example `docker-compose.yml` for Unraid and commit it to this PR.
