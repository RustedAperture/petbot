import type { Request, Response } from "express";
import { getLeaderboard } from "../../utilities/leaderboard.js";
import logger from "../../logger.js";

export default async function leaderboardHandler(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const locationId = req.query.locationId as string | undefined;
    if (!locationId) {
      res.status(400).json({ error: "missing_locationId" });
      return;
    }

    const actionType = (req.query.actionType as string | undefined) ?? undefined;
    const limit = Math.min(
      parseInt(req.query.limit as string, 10) || 10,
      25,
    );

    // Validate actionType if provided
    if (actionType && !["pet", "bite", "hug", "bonk", "squish", "explode"].includes(actionType)) {
      res.status(400).json({ error: "invalid_actionType" });
      return;
    }

    const discordClient = req.app.locals.client;
    if (!discordClient) {
      res.status(503).json({ error: "bot_not_ready" });
      return;
    }

    const result = await getLeaderboard({
      locationId,
      actionType,
      limit,
      discordClient,
    });

    res.json(result);
  } catch (err) {
    logger.error({ err }, "/api/leaderboard error");
    res.status(500).json({ error: "server_error" });
  }
}
