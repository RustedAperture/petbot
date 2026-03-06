import { optOut } from "../../db/schema.js";
import { drizzleDb } from "../../db/connector.js";
import { eq } from "drizzle-orm";
import logger from "../../logger.js";

export default async function optOutHandler(req: any, res: any) {
  const now = new Date().toISOString();

  // GET /api/optOut?userId=xxx  → { optedOut: bool }
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
      logger.info({ userId }, "optOut GET");
      const rows: any = await drizzleDb
        .select()
        .from(optOut)
        .where(eq(optOut.userId, userId))
        .limit(1);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ optedOut: rows.length > 0 }));
      return;
    } catch (err) {
      logger.error({ err }, "optOut GET error");
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "server_error" }));
      return;
    }
  }

  // POST /api/optOut?userId=xxx  → insert row (opt user out)
  if (req.method === "POST") {
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
      logger.info({ userId }, "optOut POST – opting out");
      await drizzleDb
        .insert(optOut)
        .values({ userId, createdAt: now, updatedAt: now })
        .onConflictDoUpdate({ target: optOut.userId, set: { updatedAt: now } });
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
      return;
    } catch (err) {
      logger.error({ err }, "optOut POST error");
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "server_error" }));
      return;
    }
  }

  // DELETE /api/optOut?userId=xxx  → remove row (opt user in)
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
      logger.info({ userId }, "optOut DELETE – opting in");
      await drizzleDb.delete(optOut).where(eq(optOut.userId, userId));
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
      return;
    } catch (err) {
      logger.error({ err }, "optOut DELETE error");
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "server_error" }));
      return;
    }
  }

  res.writeHead(405, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "method_not_allowed" }));
}
