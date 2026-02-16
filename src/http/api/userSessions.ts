import { UserSession } from "../../utilities/db.js";

export default async function userSessionsHandler(req: any, res: any) {
  if (req.method === "GET") {
    try {
      const url = new URL(
        req.url || "",
        `http://${req.headers.host || "localhost"}`,
      );
      const userId = url.searchParams.get("userId");
      if (!userId) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "missing_userId" }));
        return;
      }

      const row = await (UserSession as any).findOne({
        where: { user_id: userId },
      });
      const guilds = row ? row.get("guilds") : null;
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ guilds }));
      return;
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "server_error" }));
      return;
    }
  }

  if (req.method === "POST") {
    try {
      let body = "";
      req.on("data", (chunk: any) => (body += chunk));
      req.on("end", async () => {
        try {
          const json = JSON.parse(body || "{}");
          const userId = json.userId;
          const guilds = Array.isArray(json.guilds) ? json.guilds : [];
          if (!userId) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "missing_userId" }));
            return;
          }

          // Upsert (create or update)
          await (UserSession as any).upsert({
            user_id: userId,
            guilds,
            updatedAt: new Date(),
            createdAt: new Date(),
          });

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: true }));
        } catch (err) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "invalid_json" }));
        }
      });
      return;
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "server_error" }));
      return;
    }
  }

  if (req.method === "DELETE") {
    try {
      const url = new URL(
        req.url || "",
        `http://${req.headers.host || "localhost"}`,
      );
      const userId = url.searchParams.get("userId");
      if (!userId) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "missing_userId" }));
        return;
      }

      await (UserSession as any).destroy({ where: { user_id: userId } });
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
      return;
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "server_error" }));
      return;
    }
  }

  res.writeHead(405, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "method_not_allowed" }));
}
