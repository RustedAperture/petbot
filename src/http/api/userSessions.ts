import { userSessions } from "../../db/schema.js";
import { drizzleDb } from "../../db/connector.js";
import { eq } from "drizzle-orm";

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

      const rows: any = await drizzleDb
        .select()
        .from(userSessions)
        .where(eq(userSessions.userId, userId))
        .limit(1);
      // Preserve an empty array ([]) returned by the DB — only fall back to
      // `null` when there is no session row at all.
      const guilds = rows?.[0]?.guilds ?? null;
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ guilds }));
      return;
    } catch (_err) {
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
          await drizzleDb
            .insert(userSessions)
            .values({
              userId: userId,
              guilds: guilds,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            })
            .onConflictDoUpdate({
              target: userSessions.userId,
              set: {
                guilds: guilds,
                updatedAt: new Date().toISOString(),
              },
            });

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: true }));
        } catch (_err) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "invalid_json" }));
        }
      });
      return;
    } catch (_err) {
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

      await drizzleDb
        .delete(userSessions)
        .where(eq(userSessions.userId, userId));

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
      return;
    } catch (_err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "server_error" }));
      return;
    }
  }

  res.writeHead(405, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "method_not_allowed" }));
}
