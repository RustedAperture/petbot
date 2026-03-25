import type { Request, Response, NextFunction } from "express";

/**
 * A legacy handler takes raw Node http req/res plus optional extra args.
 * We use `any` for the extra args here because existing handlers have
 * specific types (e.g. Client<boolean>) that don't unify with unknown[].
 */
type LegacyHandler = (
  req: any,
  res: any,
  ...args: any[]
) => Promise<void> | void;

/**
 * Wraps a legacy raw-Node handler so it can be used as an Express route handler.
 *
 * Express Request/Response extend the Node http types, so the cast is safe
 * for the subset of properties the existing handlers use (req.url, req.method,
 * req.headers, req.socket.remoteAddress, res.writeHead, res.end).
 *
 * Extra arguments (e.g. the Discord client) are forwarded through closure.
 */
export function adaptLegacy(
  handler: LegacyHandler,
  ...extraArgs: unknown[]
): (req: Request, res: Response, next: NextFunction) => void {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await handler(req, res, ...extraArgs);
    } catch (err) {
      next(err);
    }
  };
}
