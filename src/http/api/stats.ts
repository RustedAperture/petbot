import { drizzleDb } from "../../db/connector.js";
import { actionData, botData } from "../../db/schema.js";
import { ACTIONS } from "../../types/constants.js";
import { sql, eq, and } from "drizzle-orm";
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
    const effectiveUserId: string | null = userId;
    if (userId && guildId) {
      const r: any = await drizzleDb
        .select({ c: sql`COUNT(*)` })
        .from(actionData)
        .where(
          and(
            eq(actionData.userId, userId),
            eq(actionData.locationId, guildId),
          ),
        );
      const userRowCount = Number(r?.[0]?.c ?? 0);

      if (userRowCount === 0) {
        // user has no rows for that location — do not disclose location stats
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "not_found" }));
        return;
      }
    }

    if (userId || guildId) {
      // Filtered response (user or guild specific)
      const sums: number[] = await Promise.all(
        actionKinds.map(async (k) => {
          const whereClauses: any[] = [eq(actionData.actionType, k)];
          if (effectiveUserId) {
            whereClauses.push(eq(actionData.userId, effectiveUserId));
          }
          if (guildId) {
            whereClauses.push(eq(actionData.locationId, guildId));
          }
          const r: any = await drizzleDb
            .select({ s: sql`SUM(${actionData.hasPerformed})` })
            .from(actionData)
            .where(and(...whereClauses));
          return Number(r?.[0]?.s ?? 0);
        }),
      );

      const users: number[] = await Promise.all(
        actionKinds.map(async (k) => {
          const whereClauses: any[] = [eq(actionData.actionType, k)];
          if (effectiveUserId) {
            whereClauses.push(eq(actionData.userId, effectiveUserId));
          }
          if (guildId) {
            whereClauses.push(eq(actionData.locationId, guildId));
          }
          whereClauses.push(sql`${actionData.hasPerformed} > 0`);
          const r: any = await drizzleDb
            .select({ cnt: sql`COUNT(DISTINCT ${actionData.userId})` })
            .from(actionData)
            .where(and(...whereClauses));
          return Number(r?.[0]?.cnt ?? 0);
        }),
      );

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
        const r: any = await drizzleDb
          .select({ c: sql`COUNT(*)` })
          .from(actionData)
          .where(
            and(
              eq(actionData.userId, effectiveUserId),
              ...(guildId ? [eq(actionData.locationId, guildId)] : []),
              sql`${actionData.hasPerformed} > 0`,
            ),
          );
        const userPresence = Number(r?.[0]?.c ?? 0);
        totalUniqueUsers = userPresence > 0 ? 1 : 0;
      } else if (guildId) {
        // guild-scoped: distinct users at the location
        const r: any = await drizzleDb
          .select({ cnt: sql`COUNT(DISTINCT ${actionData.userId})` })
          .from(actionData)
          .where(
            and(
              eq(actionData.locationId, guildId),
              sql`${actionData.hasPerformed} > 0`,
            ),
          );
        totalUniqueUsers = Number(r?.[0]?.cnt ?? 0);
      }

      // totalLocations for a filtered query:
      // - user-scoped (with guild filter): 1 if the user has presence at that location
      // - user-scoped (no guild filter): distinct locations the user has records in
      // - guild-scoped: 1 if the location exists
      let totalLocations = 0;
      if (effectiveUserId) {
        if (guildId) {
          const r: any = await drizzleDb
            .select({ c: sql`COUNT(*)` })
            .from(actionData)
            .where(
              and(
                eq(actionData.userId, effectiveUserId),
                eq(actionData.locationId, guildId),
              ),
            );
          totalLocations = Number(r?.[0]?.c ?? 0) > 0 ? 1 : 0;
        } else {
          const r: any = await drizzleDb
            .select({ cnt: sql`COUNT(DISTINCT ${actionData.locationId})` })
            .from(actionData)
            .where(eq(actionData.userId, effectiveUserId));
          totalLocations = Number(r?.[0]?.cnt ?? 0);
        }
      } else if (guildId) {
        const r: any = await drizzleDb
          .select({ c: sql`COUNT(*)` })
          .from(actionData)
          .where(eq(actionData.locationId, guildId));
        totalLocations = Number(r?.[0]?.c ?? 0) > 0 ? 1 : 0;
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
    const sums: number[] = await Promise.all(
      actionKinds.map(async (k) => {
        const r: any = await drizzleDb
          .select({ s: sql`SUM(${actionData.hasPerformed})` })
          .from(actionData)
          .where(eq(actionData.actionType, k));
        return Number(r?.[0]?.s ?? 0);
      }),
    );

    const users: number[] = await Promise.all(
      actionKinds.map(async (k) => {
        const r: any = await drizzleDb
          .select({ cnt: sql`COUNT(DISTINCT ${actionData.userId})` })
          .from(actionData)
          .where(
            and(
              eq(actionData.actionType, k),
              sql`${actionData.hasPerformed} > 0`,
            ),
          );
        return Number(r?.[0]?.cnt ?? 0);
      }),
    );

    const rl: any = await drizzleDb
      .select({ cnt: sql`COUNT(DISTINCT ${actionData.locationId})` })
      .from(actionData);
    const totalLocations = Number(rl?.[0]?.cnt ?? 0);

    const gc: any = await drizzleDb
      .select({ cnt: sql`COUNT(*)` })
      .from(botData);
    const guildCount = Number(gc?.[0]?.cnt ?? 0);

    const ru: any = await drizzleDb
      .select({ cnt: sql`COUNT(DISTINCT ${actionData.userId})` })
      .from(actionData)
      .where(sql`${actionData.hasPerformed} > 0`);
    const totalUniqueUsers = Number(ru?.[0]?.cnt ?? 0);

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
