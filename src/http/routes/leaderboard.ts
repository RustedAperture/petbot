import type { Request, Response } from "express";
import type { Client } from "discord.js";
import { getLeaderboard } from "../../utilities/leaderboard.js";
import logger from "../../logger.js";

export default function leaderboardHandler(client: Client) {
  return async function (req: Request, res: Response): Promise<void> {
    try {
      const locationId = req.query.locationId as string | undefined;
      const actionType = (req.query.actionType as string | undefined) ?? undefined;
      const currentUserId = req.query.currentUserId as string | undefined;
      const limit = Math.min(
        parseInt(req.query.limit as string, 10) || 10,
        25,
      );

      if (
        actionType &&
        !["pet", "bite", "hug", "bonk", "squish", "explode"].includes(actionType)
      ) {
        res.status(400).json({ error: "invalid_actionType" });
        return;
      }

      const result = await getLeaderboard({
        locationId,
        actionType,
        limit,
        currentUserId,
        discordClient: client,
      });

      res.json(result);
    } catch (err) {
      logger.error({ err }, "/api/leaderboard error");
      res.status(500).json({ error: "server_error" });
    }
  };
}
