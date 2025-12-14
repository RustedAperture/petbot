import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Client, Collection, GatewayIntentBits } from "discord.js";

const config = JSON.parse(
  fs.readFileSync(new URL("./config.json", import.meta.url), "utf8"),
);
import { Sequelize } from "sequelize";
import { Umzug, SequelizeStorage } from "umzug";
import logger from "./logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const { token } = config as { token: string };


if (process.env.TUI === "1") {
  import("./tui/dashboard.js").catch((err) => {
    
    console.error("Failed to start TUI:", err);
  });
}

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
          return fn?.(context);
        },
        down: async () => {
          const mod = await import(pathToFileURL(mPath!).href);
          const fn = (mod as any).down || (mod as any).default?.down;
          return fn?.(context);
        },
      };
    },
  },
  context: sequelize.getQueryInterface(),
  storage: new SequelizeStorage({ sequelize }),
  logger: console,
});

umzug.up();

const client: Client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.MessageContent],
});

client.on("error", logger.error);
client.on("warn", logger.warn);

client.slashCommands = new Collection();
client.contextCommands = new Collection();

const foldersPath = path.join(__dirname, "commands");
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
  const commandsPath = path.join(foldersPath, folder);
  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((file) => file.endsWith(".js")); 
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const loaded = await import(pathToFileURL(filePath).href);
    const command = (loaded as any).default || loaded; 
    if ("data" in command && "execute" in command) {
      
      const isContext =
        command.data.constructor.name === "ContextMenuCommandBuilder";
      if (isContext) {
        client.contextCommands.set(command.data.name, command);
      } else {
        client.slashCommands.set(command.data.name, command);
      }
      logger.warn(
        `Loaded command ${command.data.name} from ${filePath} (${isContext ? "context" : "slash"})`,
      );
    } else {
      logger.warn(
        `The command at ${filePath} is missing a required "data" or "execute" property.`,
      );
    }
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
