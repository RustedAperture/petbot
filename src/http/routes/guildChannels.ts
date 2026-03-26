import type { Request, Response } from "express";
import type { Client } from "discord.js";
import { ChannelType, TextChannel } from "discord.js";
import { isGuildAdmin } from "../../utilities/helper.js";
import logger from "../../logger.js";

/**
 * GET /api/guildChannels/:guildId/user/:userId — list text channels for a guild.
 * Requires Discord client context via closure.
 */
export default function guildChannelsHandler(client: Client<boolean>) {
  return async (req: Request, res: Response) => {
    const guildId = req.params.guildId as string;
    const userId = req.params.userId as string;

    try {
      const isAdmin = await isGuildAdmin(client, guildId, userId);
      if (!isAdmin) {
        res.status(403).json({ error: "forbidden" });
        return;
      }

      const guild = await client.guilds.fetch(guildId);
      if (!guild) {
        res.status(404).json({ error: "guild_not_found" });
        return;
      }

      const channels = await guild.channels.fetch();
      const textChannels = Array.from(channels.values())
        .filter(
          (c): c is TextChannel => !!c && c.type === ChannelType.GuildText,
        )
        .map((c) => ({ id: c.id, name: c.name }));

      res.json({ channels: textChannels });
    } catch (err) {
      logger.error({ err }, "guildChannels error");
      const body: Record<string, unknown> = { error: "server_error" };
      if (process.env.NODE_ENV !== "production") {
        body.details = err instanceof Error ? err.message : String(err);
      }
      res.status(500).json(body);
    }
  };
}
