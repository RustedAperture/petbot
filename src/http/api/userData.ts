import { actionData, optOut } from "../../db/schema.js";
import { drizzleDb } from "../../db/connector.js";
import { eq } from "drizzle-orm";

export default async function userDataHandler(req: any, res: any) {
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

      await drizzleDb.delete(actionData).where(eq(actionData.userId, userId));
      await drizzleDb.delete(optOut).where(eq(optOut.userId, userId));

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
