import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Client, Collection, GatewayIntentBits } from "discord.js";

import config from "./config.js";
import { Sequelize } from "sequelize";
import { Umzug, SequelizeStorage } from "umzug";
import logger from "./logger.js";
import { startHttpServer } from "./http/server.js";

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

const foldersPath = path.join(__dirname, "commands");

const slashPath = path.join(foldersPath, "slash");
const contextPath = path.join(foldersPath, "context");

const scanAndLoad = async (commandsPath: string, type: "slash" | "context") => {
  if (
    !fs.existsSync(commandsPath) ||
    !fs.statSync(commandsPath).isDirectory()
  ) {
    logger.warn(`No ${type} commands folder at ${commandsPath}, skipping.`);
    return;
  }

  const allJsFiles = fs
    .readdirSync(commandsPath)
    .filter((file) => file.endsWith(".js"));
  const commandFiles = allJsFiles.filter(
    (file) => path.parse(file).name !== "index",
  );
  const skipped = allJsFiles.filter(
    (file) => path.parse(file).name === "index",
  );

  if (skipped.length > 0) {
    logger.warn(
      `Skipping index files in ${commandsPath}: ${skipped.join(", ")}`,
    );
  }

  for (const file of commandFiles) {
    // Sanitize filename to prevent path traversal (must be a plain basename)
    const safeName = path.basename(file);
    if (safeName !== file || file.includes("..") || file.includes(path.sep)) {
      logger.warn(
        `Skipping suspicious command filename in ${commandsPath}: ${file}`,
      );
      continue;
    }

    // join using the sanitized basename only; avoid resolving user-controlled segments
    const filePath = path.join(commandsPath, safeName);

    const loaded = await import(pathToFileURL(filePath).href);
    const command = (loaded as any).default || loaded;

    if (command && (command as any).disabled) {
      logger.warn(`Skipping disabled command in ${filePath}`);
      continue;
    }

    if ("data" in command && "execute" in command) {
      if (type === "context") {
        client.contextCommands.set(command.data.name, command);
      } else {
        client.slashCommands.set(command.data.name, command);
      }
      logger.warn(
        `Loaded command ${command.data.name} from ${filePath} (${type})`,
      );
    } else {
      logger.warn(
        `The command at ${filePath} is missing a required "data" or "execute" property.`,
      );
    }
  }
};

await scanAndLoad(slashPath, "slash");
await scanAndLoad(contextPath, "context");

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
