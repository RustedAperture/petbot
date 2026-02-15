import http from "node:http";
import { URL } from "node:url";
import { ActionData, BotData } from "../utilities/db.js";
import { Op } from "sequelize";

export function startHttpServer(port = Number(process.env.HTTP_PORT) || 3001) {
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(
        req.url || "",
        `http://${req.headers.host ?? "localhost"}`,
      );
      const pathname = url.pathname;

      if (req.method === "GET" && pathname === "/api/health") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
        return;
      }

      if (req.method === "GET" && pathname === "/api/stats") {
        const [
          petSum,
          biteSum,
          guildCount,
          totalPetUsers,
          totalLocations,
          totalPetPerformedUsers,
          totalBitePerformedUsers,
        ] = await Promise.all([
          ActionData.sum("has_performed", { where: { action_type: "pet" } }),
          ActionData.sum("has_performed", { where: { action_type: "bite" } }),
          BotData.count(),
          ActionData.count({
            distinct: true,
            col: "user_id",
            where: { action_type: "pet" },
          }),
          ActionData.count({
            distinct: true,
            col: "location_id",
            where: { action_type: "pet" },
          }),
          ActionData.count({
            distinct: true,
            col: "user_id",
            where: { action_type: "pet", has_performed: { [Op.gt]: 0 } },
          }),
          ActionData.count({
            distinct: true,
            col: "user_id",
            where: { action_type: "bite", has_performed: { [Op.gt]: 0 } },
          }),
        ]);

        const body = {
          totalHasPet: Number(petSum) || 0,
          totalHasBitten: Number(biteSum) || 0,
          totalGuilds: guildCount || 0,
          totalPetUsers: totalPetUsers || 0,
          totalLocations: totalLocations || 0,
          totalPetPerformedUsers: totalPetPerformedUsers || 0,
          totalBitePerformedUsers: totalBitePerformedUsers || 0,
        };

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(body));
        return;
      }

      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "not_found" }));
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("HTTP server error:", err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "server_error" }));
    }
  });

  server.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`HTTP API listening on port ${port}`);
  });

  return server;
}
