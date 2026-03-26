import { Router } from "express";
import type { Request, Response } from "express";
import { optOut } from "../../db/schema.js";
import { drizzleDb } from "../../db/connector.js";
import { eq } from "drizzle-orm";
import logger from "../../logger.js";

const router = Router();

/**
 * GET /api/optOut/:userId — check if a user is opted out.
 */
router.get("/:userId", async (req: Request, res: Response) => {
  const userId = req.params.userId as string;

  try {
    logger.info({ userId }, "optOut GET");
    const rows: any = await drizzleDb
      .select()
      .from(optOut)
      .where(eq(optOut.userId, userId))
      .limit(1);
    res.json({ optedOut: rows.length > 0 });
  } catch (err) {
    logger.error({ err }, "optOut GET error");
    res.status(500).json({ error: "server_error" });
  }
});

/**
 * POST /api/optOut/:userId — opt a user out.
 */
router.post("/:userId", async (req: Request, res: Response) => {
  const userId = req.params.userId as string;
  const now = new Date().toISOString();

  try {
    logger.info({ userId }, "optOut POST – opting out");
    await drizzleDb
      .insert(optOut)
      .values({ userId, createdAt: now, updatedAt: now })
      .onConflictDoUpdate({ target: optOut.userId, set: { updatedAt: now } });
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "optOut POST error");
    res.status(500).json({ error: "server_error" });
  }
});

/**
 * DELETE /api/optOut/:userId — opt a user back in.
 */
router.delete("/:userId", async (req: Request, res: Response) => {
  const userId = req.params.userId as string;

  try {
    logger.info({ userId }, "optOut DELETE – opting in");
    await drizzleDb.delete(optOut).where(eq(optOut.userId, userId));
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "optOut DELETE error");
    res.status(500).json({ error: "server_error" });
  }
});

export default router;
