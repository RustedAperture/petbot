import type { Request, Response, NextFunction } from "express";
import logger from "../../logger.js";

/**
 * Express middleware that logs every request with method, path, and elapsed time.
 * Mirrors the timing/logging behavior of the legacy handler in server.ts.
 */
export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const start = Date.now();

  logger.info({ method: req.method, pathname: req.path }, "HTTP request");

  res.on("finish", () => {
    const elapsed = Date.now() - start;
    logger.info(
      { method: req.method, pathname: req.originalUrl, elapsed },
      "HTTP request handled",
    );
  });

  next();
}
