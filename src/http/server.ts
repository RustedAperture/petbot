import http from "node:http";
import { URL } from "node:url";
import { ActionData, BotData } from "../utilities/db.js";
import { Op } from "sequelize";
import logger from "../logger.js";

// API handlers (each API is implemented in its own file)
import healthHandler from "./api/health.js";
import statsHandler from "./api/stats.js";
import { ACTIONS } from "../types/constants.js";

export function startHttpServer(port = Number(process.env.HTTP_PORT) || 3001) {
  const server = http.createServer(async (req, res) => {
    const start = Date.now();
    try {
      const url = new URL(
        req.url || "",
        `http://${req.headers.host ?? "localhost"}`,
      );
      const pathname = url.pathname;

      // basic request logging
      logger.info({ method: req.method, pathname }, "HTTP request");

      // API routing: delegate to per-endpoint handlers under `src/http/api/`
      if (pathname.startsWith("/api/")) {
        const apiRouter: Record<string, Function> = {
          "/api/health": healthHandler,
          "/api/stats": statsHandler,
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

  server.listen(port, () => {
    logger.info("HTTP API listening on port " + port);
  });

  return server;
}
