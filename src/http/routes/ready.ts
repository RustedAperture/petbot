import type { Request, Response } from "express";
import { readiness } from "../readiness.js";

/**
 * GET /api/ready — readiness probe.
 * Returns 200 only when both the bot and database are initialized.
 */
export default function readyHandler(_req: Request, res: Response): void {
  const ready = readiness.botReady && readiness.dbReady;

  res.status(ready ? 200 : 503).json({
    ready,
    bot: readiness.botReady,
    db: readiness.dbReady,
  });
}
