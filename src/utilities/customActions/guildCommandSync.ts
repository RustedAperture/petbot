import {
  Routes,
  SlashCommandBuilder,
  type Client,
  type RESTPostAPIChatInputApplicationCommandsJSONBody,
} from "discord.js";
import logger from "../../logger.js";
import {
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

const guildSyncTails = new Map<string, Promise<unknown>>();

async function runGuildSync(client: Client, guildId: string): Promise<boolean> {
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

/**
 * Overwrites the guild's commands with its current custom actions; returns false on any failure.
 * Syncs for one guild are queued so each reads the database only when its turn comes.
 */
export function syncGuildCommands(
  client: Client,
  guildId: string,
): Promise<boolean> {
  const previous = guildSyncTails.get(guildId) ?? Promise.resolve();
  const run = previous.then(() => runGuildSync(client, guildId));
  guildSyncTails.set(guildId, run);
  void run.then(() => {
    if (guildSyncTails.get(guildId) === run) {
      guildSyncTails.delete(guildId);
    }
  });
  return run;
}

/** Reconciles every cached guild, one at a time to respect rate limits; guilds without actions get an empty overwrite so failed clears are retried. */
export async function syncAllGuildCommands(client: Client): Promise<void> {
  for (const guildId of [...client.guilds.cache.keys()]) {
    await syncGuildCommands(client, guildId);
  }
}
