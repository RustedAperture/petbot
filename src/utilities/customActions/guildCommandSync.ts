import {
  Routes,
  SlashCommandBuilder,
  type Client,
  type RESTPostAPIChatInputApplicationCommandsJSONBody,
} from "discord.js";
import logger from "../../logger.js";
import {
  listAllCustomActions,
  listCustomActions,
  type CustomAction,
} from "./store.js";

export function buildGuildCommandBodies(
  actions: CustomAction[],
): RESTPostAPIChatInputApplicationCommandsJSONBody[] {
  return actions.map((a) =>
    new SlashCommandBuilder()
      .setName(a.name)
      .setDescription(`Use the server's ${a.name} action`)
      .addUserOption((o) =>
        o
          .setName("target")
          .setDescription(`Who to ${a.name}`)
          .setRequired(true),
      )
      .toJSON(),
  );
}

/** Overwrites the guild's commands with its current custom actions; returns false on any failure. */
export async function syncGuildCommands(
  client: Client,
  guildId: string,
): Promise<boolean> {
  if (!client.guilds.cache.has(guildId)) {
    return false;
  }
  const appId = client.application?.id ?? client.user?.id;
  if (!appId) {
    logger.error({ guildId }, "Cannot sync guild commands: no application id");
    return false;
  }
  try {
    const actions = await listCustomActions("guild", guildId);
    await client.rest.put(Routes.applicationGuildCommands(appId, guildId), {
      body: buildGuildCommandBodies(actions),
    });
    return true;
  } catch (error) {
    logger.error({ err: error, guildId }, "Failed to sync guild commands");
    return false;
  }
}

/** Syncs every guild that has custom actions, one at a time to respect rate limits. */
export async function syncAllGuildCommands(client: Client): Promise<void> {
  const actions = await listAllCustomActions({ scope: "guild" });
  const guildIds = [...new Set(actions.map((a) => a.ownerId))];
  for (const guildId of guildIds) {
    await syncGuildCommands(client, guildId);
  }
}
