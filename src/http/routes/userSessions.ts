import { Router } from "express";
import type { Request, Response } from "express";
import { userSessions } from "../../db/schema.js";
import { drizzleDb } from "../../db/connector.js";
import { eq } from "drizzle-orm";

const router = Router();

/**
 * GET /api/userSessions/:userId — retrieve session guilds for a user.
 */
router.get("/:userId", async (req: Request, res: Response) => {
  const userId = req.params.userId as string | undefined;

  if (!userId) {
    res.status(400).json({ error: "missing_userId" });
    return;
  }

  const rows: any = await drizzleDb
    .select()
    .from(userSessions)
    .where(eq(userSessions.userId, userId))
    .limit(1);

  // Preserve an empty array ([]) returned by the DB — only fall back to
  // `null` when there is no session row at all.
  const guilds = rows?.[0]?.guilds ?? null;
  res.json({ guilds });
});

/**
 * POST /api/userSessions/:userId — create or update session guilds for a user.
 * Body: { guilds: string[] }
 */
router.post("/:userId", async (req: Request, res: Response) => {
  const userId = req.params.userId as string | undefined;
  const guilds = Array.isArray(req.body.guilds) ? req.body.guilds : [];

  if (!userId) {
    res.status(400).json({ error: "missing_userId" });
    return;
  }

  await drizzleDb
    .insert(userSessions)
    .values({
      userId,
      guilds,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .onConflictDoUpdate({
      target: userSessions.userId,
      set: {
        guilds,
        updatedAt: new Date().toISOString(),
      },
    });

  res.json({ ok: true });
});

/**
 * DELETE /api/userSessions/:userId — remove session for a user.
 */
router.delete("/:userId", async (req: Request, res: Response) => {
  const userId = req.params.userId as string | undefined;

  if (!userId) {
    res.status(400).json({ error: "missing_userId" });
    return;
  }

  await drizzleDb.delete(userSessions).where(eq(userSessions.userId, userId));
  res.json({ ok: true });
});

export default router;
