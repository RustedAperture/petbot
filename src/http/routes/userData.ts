import type { Request, Response } from "express";
import { actionData, optOut } from "../../db/schema.js";
import { drizzleDb } from "../../db/connector.js";
import { eq } from "drizzle-orm";

/**
 * DELETE /api/userData/:userId — purge all data for a user.
 * Deletes action data and opt-out records.
 */
export default async function userDataHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const userId = req.params.userId as string | undefined;

  if (!userId) {
    res.status(400).json({ error: "missing_userId" });
    return;
  }

  await drizzleDb.delete(actionData).where(eq(actionData.userId, userId));
  await drizzleDb.delete(optOut).where(eq(optOut.userId, userId));

  res.json({ ok: true });
}
