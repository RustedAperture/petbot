# PetBot Web (MVP)

This is a small Next.js + MUI Joy web UI that shows global PetBot stats (MVP).

Quick start (from repo root):

1. Build the backend helpers so the web API can reuse the compiled helper:

   ```bash
   npm run build
   ```

2. Install web deps and run the dev server:

   ```bash
   cd web
   npm install
   npm run dev
   ```

3. Open http://localhost:3000

Notes:

- The API route imports `fetchGlobalStats` from `dist/src/utilities/helper.js` so ensure the root `npm run build` has been run before starting the web dev server.
- Auth is not implemented in the MVP; that will be added later when we implement OAuth and per-guild views.
