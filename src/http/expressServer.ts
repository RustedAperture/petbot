import http from "node:http";
import https from "node:https";
import fs from "node:fs";
import express from "express";
import helmet from "helmet";
import type { Client } from "discord.js";
import logger from "../logger.js";

import { authMiddleware } from "./middleware/auth.js";
import { requestLogger } from "./middleware/requestLogger.js";

import healthHandler from "./routes/health.js";
import readyHandler from "./routes/ready.js";

import { adaptLegacy } from "./adapters.js";

// Legacy API handlers (raw Node http signatures)
import statsHandler from "./api/stats.js";
import guildsHandler from "./api/guilds.js";
import userSessionsHandler from "./api/userSessions.js";
import userDataHandler from "./api/userData.js";
import optOutHandler from "./api/optOut.js";
import setImagesHandler from "./api/setImages.js";
import serverSettingsHandler from "./api/serverSettings.js";
import guildChannelsHandler from "./api/guildChannels.js";

/**
 * Resolve TLS key/cert from env vars.
 * Tries inline PEM first, then falls back to file path.
 */
function resolveTls(): { key?: string; cert?: string } {
  const key =
    process.env.HTTP_TLS_KEY ||
    (process.env.HTTP_TLS_KEY_PATH
      ? fs.readFileSync(process.env.HTTP_TLS_KEY_PATH, "utf8")
      : undefined);
  const cert =
    process.env.HTTP_TLS_CERT ||
    (process.env.HTTP_TLS_CERT_PATH
      ? fs.readFileSync(process.env.HTTP_TLS_CERT_PATH, "utf8")
      : undefined);
  return { key, cert };
}

/**
 * Create and configure the Express application.
 * Separated from listen so it can be tested or mounted independently.
 */
export function createApp(client?: Client<boolean>): express.Express {
  const app = express();

  // --- Security: reduce server fingerprinting ---
  app.disable("x-powered-by");

  // --- Security headers (Helmet) ---
  app.use(helmet());

  // --- Global middleware ---
  app.use(express.json({ limit: "1mb" }));
  app.use(requestLogger);

  // --- Auth middleware on /api/* ---
  app.use("/api", authMiddleware);

  // --- Routes ---

  // Liveness probe (no auth required — but authMiddleware already runs on /api,
  // which is fine: health is an authenticated liveness check, matching current behavior)
  app.get("/api/health", healthHandler);

  // Readiness probe
  app.get("/api/ready", readyHandler);

  // --- Legacy endpoint routes (adapted from raw Node handlers) ---
  app.all("/api/stats", adaptLegacy(statsHandler));
  app.all("/api/guilds", adaptLegacy(guildsHandler));
  app.all("/api/userSessions", adaptLegacy(userSessionsHandler));
  app.all("/api/userData", adaptLegacy(userDataHandler));
  app.all("/api/optOut", adaptLegacy(optOutHandler));
  app.all("/api/setImages", adaptLegacy(setImagesHandler));

  // Routes that need the Discord client
  if (client) {
    app.all("/api/serverSettings", adaptLegacy(serverSettingsHandler, client));
    app.all("/api/guildChannels", adaptLegacy(guildChannelsHandler, client));
  }

  // --- 404 fallback for unmatched /api/* ---
  // Express 5 uses path-to-regexp v8 — wildcard syntax is {*param}
  app.all("/api/{*path}", (_req, res) => {
    res.status(404).json({ error: "not_found" });
  });

  // --- Global error handler ---
  app.use(
    (
      err: Error,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      logger.error({ err }, "HTTP server error");
      res.status(500).json({ error: "server_error" });
    },
  );

  return app;
}

/**
 * Start the HTTP(S) server.
 *
 * Signature mirrors the legacy startHttpServer so index.ts only changes
 * its import path.
 */
export function startHttpServer(
  port = Number(process.env.HTTP_PORT) || 3001,
  host = process.env.HTTP_HOST || "127.0.0.1",
  client?: Client<boolean>,
): http.Server | https.Server {
  const { key, cert } = resolveTls();

  // Safety guard: refuse to bind to a public interface in production
  // unless TLS or INTERNAL_API_SECRET is configured.
  const isPublicHost =
    host !== "127.0.0.1" && host !== "localhost" && host !== "::1";
  if (
    process.env.NODE_ENV === "production" &&
    isPublicHost &&
    !(key && cert) &&
    !process.env.INTERNAL_API_SECRET
  ) {
    throw new Error(
      "Refusing to bind the bot HTTP API to a public interface in production without TLS or INTERNAL_API_SECRET",
    );
  }

  const app = createApp(client);

  let server: http.Server | https.Server;
  if (key && cert) {
    server = https.createServer({ key, cert }, app);
    server.listen(port, host, () => {
      logger.info(`HTTPS API listening on ${host}:${port}`);
    });
  } else {
    server = http.createServer(app);
    server.listen(port, host, () => {
      logger.info(`HTTP API listening on ${host}:${port}`);
    });
  }

  return server;
}
