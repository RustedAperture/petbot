import { Router } from "express";
import type { Request, Response } from "express";
import type { Client } from "discord.js";
import { checkImage } from "../../utilities/check_image.js";
import { normalizeUrl } from "../../utilities/normalizeUrl.js";
import { canManageServerActions } from "../../utilities/helper.js";
import { validateCustomActionInput } from "../../utilities/customActions/validation.js";
import {
  listCustomActions,
  removeCustomAction,
  upsertCustomAction,
  type CustomActionScope,
} from "../../utilities/customActions/store.js";
import { syncGuildCommands } from "../../utilities/customActions/guildCommandSync.js";

const NO_GUILD_ERROR = "Add PetBot to this server to create server actions.";
const INVALID_IMAGE_ERROR = "Your URL is invalid, please try again";

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/** Validates the body like `/custom-action add`; returns the cleaned input or an error message. */
async function parseBody(
  body: unknown,
): Promise<{ name: string; phrase: string; image: string } | { error: string }> {
  const { name, phrase, image } = (body ?? {}) as Record<string, unknown>;
  const validated = validateCustomActionInput({
    name: asString(name),
    phrase: asString(phrase),
  });
  if ("error" in validated) {
    return validated;
  }
  const normalized = normalizeUrl(asString(image));
  if (!normalized || !(await checkImage(normalized))) {
    return { error: INVALID_IMAGE_ERROR };
  }
  return { ...validated, image: normalized };
}

async function save(
  body: unknown,
  scope: CustomActionScope,
  ownerId: string,
  createdBy: string,
) {
  const parsed = await parseBody(body);
  if ("error" in parsed) {
    return parsed;
  }
  return upsertCustomAction({ scope, ownerId, createdBy, ...parsed });
}

function reply(res: Response, result: Awaited<ReturnType<typeof save>>): void {
  if ("error" in result) {
    res.status(400).json({ error: result.error });
    return;
  }
  res.json({ action: result.action });
}

export default function customActionsRouter(client?: Client<boolean>): Router {
  const router = Router();

  router.get("/user/:userId", async (req: Request, res: Response) => {
    res.json({ actions: await listCustomActions("user", req.params.userId as string) });
  });

  router.put("/user/:userId", async (req: Request, res: Response) => {
    const userId = req.params.userId as string;
    reply(res, await save(req.body, "user", userId, userId));
  });

  router.delete("/user/:userId/:name", async (req: Request, res: Response) => {
    const isRemoved = await removeCustomAction(
      "user",
      req.params.userId as string,
      req.params.name as string,
    );
    if (!isRemoved) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    res.json({ ok: true });
  });

  if (!client) {
    return router;
  }

  router.get("/guild/:guildId", async (req: Request, res: Response) => {
    res.json({ actions: await listCustomActions("guild", req.params.guildId as string) });
  });

  /** Runs the bot-in-guild and manage-rights checks; replies and returns false when either fails. */
  async function authorise(req: Request, res: Response): Promise<boolean> {
    const guildId = req.params.guildId as string;
    if (!client!.guilds.cache.has(guildId)) {
      res.status(400).json({ error: NO_GUILD_ERROR });
      return false;
    }
    if (!(await canManageServerActions(client!, guildId, req.params.userId as string))) {
      res.status(403).json({ error: "forbidden" });
      return false;
    }
    return true;
  }

  router.put("/guild/:guildId/user/:userId", async (req: Request, res: Response) => {
    if (!(await authorise(req, res))) {
      return;
    }
    const guildId = req.params.guildId as string;
    const result = await save(req.body, "guild", guildId, req.params.userId as string);
    if ("action" in result) {
      await syncGuildCommands(client, guildId);
    }
    reply(res, result);
  });

  router.delete(
    "/guild/:guildId/user/:userId/:name",
    async (req: Request, res: Response) => {
      if (!(await authorise(req, res))) {
        return;
      }
      const guildId = req.params.guildId as string;
      const isRemoved = await removeCustomAction("guild", guildId, req.params.name as string);
      if (!isRemoved) {
        res.status(404).json({ error: "not_found" });
        return;
      }
      await syncGuildCommands(client, guildId);
      res.json({ ok: true });
    },
  );

  return router;
}
