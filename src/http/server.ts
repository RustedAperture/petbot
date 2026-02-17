import http from "node:http";
import https from "node:https";
import fs from "node:fs";
import crypto from "node:crypto";
import { URL } from "node:url";
import logger from "../logger.js";

// API handlers (each API is implemented in its own file)
import healthHandler from "./api/health.js";
import statsHandler from "./api/stats.js";
import guildsHandler from "./api/guilds.js";
import userSessionsHandler from "./api/userSessions.js";

function sha256buf(s: string) {
  return crypto.createHash("sha256").update(String(s)).digest();
}

function secureEqual(a?: string, b?: string) {
  if (!a || !b) {
    return false;
  }
  try {
    const ah = sha256buf(a);
    const bh = sha256buf(b);
    return crypto.timingSafeEqual(ah, bh);
  } catch {
    return false;
  }
}

export function startHttpServer(
  port = Number(process.env.HTTP_PORT) || 3001,
  host = process.env.HTTP_HOST || "127.0.0.1",
) {
  // TLS support (optional): provide raw PEM via env or file paths
  const tlsKey =
    process.env.HTTP_TLS_KEY ||
    (process.env.HTTP_TLS_KEY_PATH
      ? fs.readFileSync(process.env.HTTP_TLS_KEY_PATH, "utf8")
      : undefined);
  const tlsCert =
    process.env.HTTP_TLS_CERT ||
    (process.env.HTTP_TLS_CERT_PATH
      ? fs.readFileSync(process.env.HTTP_TLS_CERT_PATH, "utf8")
      : undefined);

  // Safety guard: refuse to bind to a public interface in production unless TLS or INTERNAL_API_SECRET is configured
  const isPublicHost =
    host !== "127.0.0.1" && host !== "localhost" && host !== "::1";
  if (
    process.env.NODE_ENV === "production" &&
    isPublicHost &&
    !tlsKey &&
    !tlsCert &&
    !process.env.INTERNAL_API_SECRET
  ) {
    throw new Error(
      "Refusing to bind the bot HTTP API to a public interface in production without TLS or INTERNAL_API_SECRET",
    );
  }

  const handler = async (req: any, res: any) => {
    const start = Date.now();
    let pathname = "/";
    try {
      const url = new URL(
        req.url || "",
        `http://${req.headers.host || "localhost"}`,
      );
      pathname = url.pathname;

      // Restrict access: by default bind/listen on localhost and reject remote requests.
      // Optional: set INTERNAL_API_SECRET to require an `x-internal-api-key` header.
      const internalSecret = process.env.INTERNAL_API_SECRET;
      if (internalSecret) {
        const key =
          (req.headers["x-internal-api-key"] as string | undefined) ||
          (req.headers["x-internal-secret"] as string | undefined);
        if (!key || !secureEqual(key, internalSecret)) {
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
          "/api/userSessions": userSessionsHandler,
        };

        const handlerFn = apiRouter[pathname];
        if (handlerFn) {
          await handlerFn(req, res);
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
  };

  let server: any;
  if (tlsKey && tlsCert) {
    server = https.createServer({ key: tlsKey, cert: tlsCert } as any, handler);
    server.listen(port, host, () => {
      logger.info(`HTTPS API listening on ${host}:${port}`);
    });
  } else {
    server = http.createServer(handler);
    server.listen(port, host, () => {
      logger.info("HTTP API listening on " + host + ":" + port);
    });
  }

  return server;
}
