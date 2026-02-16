import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Client, Collection, GatewayIntentBits } from "discord.js";

import config from "./config.js";
import { Sequelize } from "sequelize";
import { Umzug, SequelizeStorage } from "umzug";
import logger from "./logger.js";
import { startHttpServer } from "./http/server.js";

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

const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: "./data/database.sqlite",
});

const umzug = new Umzug({
  migrations: {
    glob: "migrations/*.cjs",

    resolve: ({ name, path: mPath, context }) => {
      return {
        name: name.replace(/\.cjs$/, ".js"),
        up: async () => {
          const mod = await import(pathToFileURL(mPath!).href);
          const fn = (mod as any).up || (mod as any).default?.up;
          return fn?.({ context });
        },
        down: async () => {
          const mod = await import(pathToFileURL(mPath!).href);
          const fn = (mod as any).down || (mod as any).default?.down;
          return fn?.({ context });
        },
      };
    },
  },
  context: sequelize.getQueryInterface(),
  storage: new SequelizeStorage({ sequelize }),
  logger: console,
});

await umzug.up();

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
      "A static slash command is missing a required \"data\" or \"execute\" property.",
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
      "A static context command is missing a required \"data\" or \"execute\" property.",
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
