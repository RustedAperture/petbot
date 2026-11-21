import { Router } from "express";
import type { Request, Response } from "express";
import type { Client } from "discord.js";
import {
  banCreator,
  deleteCustomActionById,
  listAllCustomActions,
  listBannedCreators,
  unbanCreator,
  type CustomActionScope,
} from "../../utilities/customActions/store.js";
import { syncGuildCommands } from "../../utilities/customActions/guildCommandSync.js";

function queryString(value: unknown): string | undefined {
  return typeof value === "string" && value !== "" ? value : undefined;
}

/** The website enforces the owner check before calling these routes. */
export default function ownerRouter(client: Client<boolean>): Router {
  const router = Router();

  router.get("/customActions", async (req: Request, res: Response) => {
    const scope = queryString(req.query.scope);
    if (scope !== undefined && scope !== "guild" && scope !== "user") {
      res.status(400).json({ error: "invalid_scope" });
      return;
    }
    res.json({
      actions: await listAllCustomActions({
        name: queryString(req.query.name),
        scope: scope as CustomActionScope | undefined,
        ownerId: queryString(req.query.ownerId),
      }),
    });
  });

  router.delete("/customActions/:id", async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const deleted = Number.isInteger(id) ? await deleteCustomActionById(id) : null;
    if (!deleted) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    if (deleted.scope === "guild") {
      await syncGuildCommands(client, deleted.ownerId);
    }
    res.json({ ok: true });
  });

  router.get("/bans", async (_req: Request, res: Response) => {
    res.json({ bans: await listBannedCreators() });
  });

  router.put("/bans/:userId", async (req: Request, res: Response) => {
    await banCreator(req.params.userId as string);
    res.json({ ok: true });
  });

  router.delete("/bans/:userId", async (req: Request, res: Response) => {
    await unbanCreator(req.params.userId as string);
    res.json({ ok: true });
  });

  return router;
}
