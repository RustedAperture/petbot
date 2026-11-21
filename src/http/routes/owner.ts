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
import logger from "../../logger.js";
import { syncGuildCommands } from "../../utilities/customActions/guildCommandSync.js";

const NUMERIC_ID = /^\d+$/;

/** Absent or empty is fine; anything but a single string is malformed (null). */
function singleString(value: unknown): string | undefined | null {
  if (value === undefined || value === "") {
    return undefined;
  }
  return typeof value === "string" ? value : null;
}

/** The website enforces the owner check before calling these routes. */
export default function ownerRouter(client: Client<boolean>): Router {
  const router = Router();

  router.get("/customActions", async (req: Request, res: Response) => {
    const name = singleString(req.query.name);
    const scope = singleString(req.query.scope);
    const ownerId = singleString(req.query.ownerId);
    const isValid =
      name !== null &&
      scope !== null &&
      ownerId !== null &&
      (scope === undefined || scope === "guild" || scope === "user") &&
      (ownerId === undefined || NUMERIC_ID.test(ownerId));
    if (!isValid) {
      res.status(400).json({ error: "invalid_filter" });
      return;
    }
    res.json({
      actions: await listAllCustomActions({
        name,
        scope: scope as CustomActionScope | undefined,
        ownerId,
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
      void syncGuildCommands(client, deleted.ownerId).catch((err) =>
        logger.error({ err, guildId: deleted.ownerId }, "Guild command sync failed"),
      );
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
