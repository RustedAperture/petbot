import type { Request, Response, NextFunction } from "express";
import { secureEqual } from "../../utilities/crypto.js";

const ALLOWED_LOCAL_ADDRESSES = new Set([
  "127.0.0.1",
  "::1",
  "::ffff:127.0.0.1",
]);

/**
 * Express middleware that enforces API authentication.
 *
 * - If INTERNAL_API_SECRET is set: require `x-internal-api-key` or
 *   `x-internal-secret` header with a timing-safe match.
 * - If not set: restrict to localhost addresses only.
 */
export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const internalSecret = process.env.INTERNAL_API_SECRET;

  if (internalSecret) {
    const key =
      (req.headers["x-internal-api-key"] as string | undefined) ||
      (req.headers["x-internal-secret"] as string | undefined);

    if (!key || !secureEqual(key, internalSecret)) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
  } else {
    const remoteAddr = req.socket.remoteAddress || "";
    if (!ALLOWED_LOCAL_ADDRESSES.has(remoteAddr)) {
      res.status(403).json({ error: "forbidden" });
      return;
    }
  }

  next();
}
