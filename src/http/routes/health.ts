import type { Request, Response } from "express";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

let version = "unknown";
try {
  const pkg = readFileSync(resolve(process.cwd(), "package.json"), "utf8");
  version = (JSON.parse(pkg) as { version?: string }).version ?? "unknown";
} catch {
  // best-effort — version stays "unknown"
}

const startTime = Date.now();

/**
 * GET /api/health — liveness probe.
 * Returns version, uptime, and timestamp.
 */
export default function healthHandler(_req: Request, res: Response): void {
  res.json({
    ok: true,
    version,
    uptime: Math.floor((Date.now() - startTime) / 1000),
    timestamp: new Date().toISOString(),
  });
}
