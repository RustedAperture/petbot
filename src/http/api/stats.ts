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
    // support optional query params to filter stats by userId and/or guildId (locationId)
    const url = new URL(
      req.url || "",
      `http://${req.headers.host || "localhost"}`,
    );
    const userId = url.searchParams.get("userId");
    const guildId =
      url.searchParams.get("guildId") || url.searchParams.get("locationId");

    const actionKinds = Object.keys(ACTIONS);

    // If both userId + guildId are supplied, interpret this as a user-scoped
    // request restricted to that location (e.g. "user X at location Y").
    // - If the user has no rows for that location, return 404.
    // - Otherwise continue and keep `effectiveUserId` set so subsequent queries
    //   apply both `user_id` and `location_id` filters.
    let effectiveUserId: string | null = userId;
    if (userId && guildId) {
      const userRowCount = await ActionData.count({
        where: { user_id: userId, location_id: guildId },
      });
      if (userRowCount === 0) {
        // user has no rows for that location — do not disclose location stats
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "not_found" }));
        return;
      }
      // leave `effectiveUserId` as `userId` so we return user-scoped data for that location
    }

    // Helper to build where-clauses depending on filters
    const baseWhere = (actionType?: string) => {
      const where: any = {};
      if (actionType) where.action_type = actionType;
      if (effectiveUserId) where.user_id = effectiveUserId;
      if (guildId) where.location_id = guildId;
      return where;
    };

    if (userId || guildId) {
      // Filtered response (user or guild specific)
      const sumsPromise = Promise.all(
        actionKinds.map((k) =>
          ActionData.sum("has_performed", { where: baseWhere(k) }),
        ),
      );

      const usersPromise = Promise.all(
        actionKinds.map((k) =>
          ActionData.count({
            distinct: true,
            col: "user_id",
            where: { ...baseWhere(k), has_performed: { [Op.gt]: 0 } },
          }),
        ),
      );

      const [sums, users] = await Promise.all([sumsPromise, usersPromise]);

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

      const totalActionsPerformed = sums.reduce(
        (acc, v) => acc + (Number(v) || 0),
        0,
      );

      // total unique users and total locations should reflect whether this is a
      // user-scoped request (userId present) or a guild-scoped request.
      let totalUniqueUsers = 0;
      if (effectiveUserId) {
        // user-scoped: check presence for the user (optionally restricted to a guild)
        const userPresence = await ActionData.count({
          where: {
            user_id: effectiveUserId,
            ...(guildId ? { location_id: guildId } : {}),
            has_performed: { [Op.gt]: 0 },
          },
        });
        totalUniqueUsers = userPresence > 0 ? 1 : 0;
      } else if (guildId) {
        // guild-scoped: distinct users at the location
        totalUniqueUsers = Number(
          await ActionData.count({
            distinct: true,
            col: "user_id",
            where: { location_id: guildId, has_performed: { [Op.gt]: 0 } },
          }),
        );
      }

      // totalLocations for a filtered query:
      // - user-scoped (with guild filter): 1 if the user has presence at that location
      // - user-scoped (no guild filter): distinct locations the user has records in
      // - guild-scoped: 1 if the location exists
      let totalLocations = 0;
      if (effectiveUserId) {
        if (guildId) {
          totalLocations =
            (await ActionData.count({
              where: { user_id: effectiveUserId, location_id: guildId },
            })) > 0
              ? 1
              : 0;
        } else {
          totalLocations = Number(
            await ActionData.count({
              distinct: true,
              col: "location_id",
              where: { user_id: effectiveUserId },
            }),
          );
        }
      } else if (guildId) {
        totalLocations =
          (await ActionData.count({ where: { location_id: guildId } })) > 0
            ? 1
            : 0;
      }

      const body = {
        totalsByAction,
        totalActionsPerformed: Number(totalActionsPerformed) || 0,
        totalUniqueUsers: Number(totalUniqueUsers) || 0,
        totalLocations: Number(totalLocations) || 0,
        totalGuilds: guildId ? 1 : undefined,
      };

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(body));
      return;
    }

    // Unfiltered (global) response — existing behavior
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
