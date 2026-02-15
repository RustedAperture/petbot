import { ActionData, BotData } from "../../utilities/db.js";
import { Op } from "sequelize";
import { ACTIONS } from "../../types/constants.js";
import logger from "../../logger.js";

export default async function statsHandler(req: any, res: any) {
  if (req.method !== "GET") {
    res.writeHead(405, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "method_not_allowed" }));
    return;
  }

  try {
    const actionKinds = Object.keys(ACTIONS);

    const sumsPromise = Promise.all(
      actionKinds.map((k) =>
        ActionData.sum("has_performed", { where: { action_type: k } }),
      ),
    );

    const usersPromise = Promise.all(
      actionKinds.map((k) =>
        ActionData.count({
          distinct: true,
          col: "user_id",
          where: { action_type: k, has_performed: { [Op.gt]: 0 } },
        }),
      ),
    );

    const [sums, users, totalLocations, guildCount, totalUniqueUsers] =
      await Promise.all([
        sumsPromise,
        usersPromise,
        ActionData.count({ distinct: true, col: "location_id" }),
        BotData.count(),
        // count only users who have performed at least one action
        ActionData.count({
          distinct: true,
          col: "user_id",
          where: { has_performed: { [Op.gt]: 0 } },
        }),
      ]);

    const totalsByAction: Record<
      string,
      { totalHasPerformed: number; totalUsers: number; imageUrl?: string }
    > = {};

    actionKinds.forEach((k, i) => {
      totalsByAction[k] = {
        totalHasPerformed: Number(sums[i]) || 0,
        totalUsers: Number(users[i]) || 0,
        imageUrl: ACTIONS[k as keyof typeof ACTIONS]?.defaultImage ?? null,
      };
    });

    // total actions performed across all action kinds (sum of per-action `has_performed`)
    const totalActionsPerformed = sums.reduce(
      (acc, v) => acc + (Number(v) || 0),
      0,
    );

    const body = {
      totalsByAction,
      totalActionsPerformed: Number(totalActionsPerformed) || 0,
      totalUniqueUsers: Number(totalUniqueUsers) || 0,
      totalLocations: Number(totalLocations) || 0,
      totalGuilds: Number(guildCount) || 0,
    };

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(body));
  } catch (err) {
    logger.error({ err }, "/api/stats error");
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "server_error" }));
  }
}
