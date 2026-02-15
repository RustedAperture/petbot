import http from "node:http";
import { URL } from "node:url";
import { ActionData, BotData } from "../utilities/db.js";
import { Op } from "sequelize";
import logger from "../logger.js";

// API handlers (each API is implemented in its own file)
import healthHandler from "./api/health.js";
import statsHandler from "./api/stats.js";
import guildsHandler from "./api/guilds.js";
import { ACTIONS } from "../types/constants.js";

export function startHttpServer(
  port = Number(process.env.HTTP_PORT) || 3001,
  host = process.env.HTTP_HOST || "127.0.0.1",
) {
  const server = http.createServer(async (req, res) => {
    const start = Date.now();
    try {
      const url = new URL(
        req.url || "",
        `http://${req.headers.host ?? "localhost"}`,
      );
      const pathname = url.pathname;

      // Restrict access: by default bind/listen on localhost and reject remote requests.
      // Optional: set INTERNAL_API_SECRET to require an `x-internal-api-key` header.
      const internalSecret = process.env.INTERNAL_API_SECRET;
      if (internalSecret) {
        const key =
          (req.headers["x-internal-api-key"] as string | undefined) ||
          (req.headers["x-internal-secret"] as string | undefined);
        if (!key || key !== internalSecret) {
          res.writeHead(401, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "unauthorized" }));
          return;
        }
      } else {
        // If no secret configured, enforce localhost-only callers.
        const remoteAddr = req.socket.remoteAddress || "";
        const allowed = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);
        if (!allowed.has(remoteAddr)) {
          res.writeHead(403, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "forbidden" }));
          return;
        }
      }

      // basic request logging
      logger.info({ method: req.method, pathname }, "HTTP request");

      // API routing: delegate to per-endpoint handlers under `src/http/api/`
      if (pathname.startsWith("/api/")) {
        const apiRouter: Record<string, Function> = {
          "/api/health": healthHandler,
          "/api/stats": statsHandler,
          "/api/guilds": guildsHandler,
        };

        const handler = apiRouter[pathname];
        if (handler) {
          await handler(req, res);
          return;
        }

        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "not_found" }));
        return;
      }

      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "not_found" }));
    } catch (err) {
      logger.error({ err }, "HTTP server error");
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "server_error" }));
    } finally {
      const elapsed = Date.now() - start;
      logger.info(
        { method: req.method, pathname: req.url, elapsed },
        "HTTP request handled",
      );
    }
  });

  server.listen(port, host, () => {
    logger.info("HTTP API listening on " + host + ":" + port);
  });

  return server;
}
