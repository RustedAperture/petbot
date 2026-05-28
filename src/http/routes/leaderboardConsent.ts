import { Router } from "express";
import type { Request, Response } from "express";
import { leaderboardConsent } from "../../db/schema.js";
import { drizzleDb } from "../../db/connector.js";
import { eq } from "drizzle-orm";
import logger from "../../logger.js";

const router = Router();

router.get("/:hashedUserId", async (req: Request, res: Response) => {
  const hashedUserId = req.params.hashedUserId as string;

  try {
    const rows = await drizzleDb
      .select()
      .from(leaderboardConsent)
      .where(eq(leaderboardConsent.hashedUserId, hashedUserId))
      .limit(1);

    if (rows.length === 0) {
      res.json({ enabled: false, displayName: null });
      return;
    }

    res.json({ enabled: true, displayName: rows[0].displayName });
  } catch (err) {
    logger.error({ err }, "leaderboardConsent GET error");
    res.status(500).json({ error: "server_error" });
  }
});

router.post("/:hashedUserId", async (req: Request, res: Response) => {
  const hashedUserId = req.params.hashedUserId as string;
  const { displayName } = req.body as { displayName?: string };

  if (!displayName || typeof displayName !== "string" || displayName.trim().length === 0) {
    res.status(400).json({ error: "displayName_required" });
    return;
  }

  const now = new Date().toISOString();

  try {
    await drizzleDb
      .insert(leaderboardConsent)
      .values({ hashedUserId, displayName: displayName.trim(), createdAt: now, updatedAt: now })
      .onConflictDoUpdate({
        target: leaderboardConsent.hashedUserId,
        set: { displayName: displayName.trim(), updatedAt: now },
      });
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "leaderboardConsent POST error");
    res.status(500).json({ error: "server_error" });
  }
});

router.delete("/:hashedUserId", async (req: Request, res: Response) => {
  const hashedUserId = req.params.hashedUserId as string;

  try {
    await drizzleDb
      .delete(leaderboardConsent)
      .where(eq(leaderboardConsent.hashedUserId, hashedUserId));
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "leaderboardConsent DELETE error");
    res.status(500).json({ error: "server_error" });
  }
});

export default router;
