import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Client, Collection, GatewayIntentBits } from "discord.js";

import config from "./config.js";
import logger from "./logger.js";
import { startHttpServer } from "./http/server.js";
import { migrate } from "drizzle-orm/libsql/migrator";
import { drizzleDb } from "./db/connector.js";
import { bootstrapDb } from "./db/bootstrap.js";
// Static commands manifest (prevents runtime file-path imports flagged by scanners)
import { slashCommands, contextCommands } from "./commands/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const { token } = config as { token: string };

declare module "discord.js" {
  export interface Client {
    slashCommands: Collection<string, any>;
    contextCommands: Collection<string, any>;
  }
}

// Run database migrations on every launch
await bootstrapDb(); // stamps legacy DBs so migrate() doesn't re-run existing DDL
await migrate(drizzleDb, { migrationsFolder: "./drizzle" });
logger.info("Database migrations applied");

// start the HTTP API for the web UI (runs on 3001 by default)
startHttpServer(Number(process.env.HTTP_PORT) || 3001);

const client: Client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.MessageContent],
});

client.on("error", logger.error);
client.on("warn", logger.warn);

client.slashCommands = new Collection();
client.contextCommands = new Collection();

// Commands are loaded from the static manifest in `./commands/index.ts`
// (replaced the previous dynamic filesystem loader to avoid runtime path
// imports and eliminate scanner false-positives).

// Register commands from the static manifest (no runtime path joins)
for (const mod of slashCommands) {
  const command = (mod as any).default || mod;
  if (!command || (command as any).disabled) {
    continue;
  }
  if ("data" in command && "execute" in command) {
    client.slashCommands.set(command.data.name, command);
    logger.warn(
      `Loaded command ${command.data.name} from static manifest (slash)`,
    );
  } else {
    logger.warn(
      'A static slash command is missing a required "data" or "execute" property.',
    );
  }
}
for (const mod of contextCommands) {
  const command = (mod as any).default || mod;
  if (!command || (command as any).disabled) {
    continue;
  }
  if ("data" in command && "execute" in command) {
    client.contextCommands.set(command.data.name, command);
    logger.warn(
      `Loaded command ${command.data.name} from static manifest (context)`,
    );
  } else {
    logger.warn(
      'A static context command is missing a required "data" or "execute" property.',
    );
  }
}

const eventsPath = path.join(__dirname, "events");
const eventFiles = fs
  .readdirSync(eventsPath)
  .filter((file) => file.endsWith(".js"));
for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = await import(pathToFileURL(filePath).href);
  const eventModule = (event as any).default || event;
  if (eventModule.once) {
    client.once(eventModule.name, (...args) => eventModule.execute(...args));
  } else {
    client.on(eventModule.name, (...args) => eventModule.execute(...args));
  }
}

client.login(token).catch((error) => {
  logger.error(error, "Bot login failed:");
  process.exit(1);
});
