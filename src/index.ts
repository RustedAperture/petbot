import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Client, Collection, GatewayIntentBits } from "discord.js";

const config = JSON.parse(
  fs.readFileSync(path.resolve(process.cwd(), "config.json"), "utf8"),
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

umzug.up();

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
    const filePath = path.join(commandsPath, file);
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

// Start a small internal HTTP server to expose bot stats for the web UI and health checks.
import http from "node:http";
import { fetchGlobalStats } from "./utilities/helper.js";

const INTERNAL_PORT = process.env.INTERNAL_PORT
  ? Number(process.env.INTERNAL_PORT)
  : 3030;
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || null;

const server = http.createServer(async (req, res) => {
  try {
    const url = req.url || "/";

    if (INTERNAL_TOKEN) {
      const provided = req.headers["x-internal-token"] as string | undefined;
      if (!provided || provided !== INTERNAL_TOKEN) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Unauthorized" }));
        return;
      }
    }

    if (url === "/internal/stats") {
      const stats = await fetchGlobalStats();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(stats));
      return;
    }

    if (url === "/internal/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok" }));
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "not found" }));
  } catch (err) {
    logger.error(err, "Internal server error");
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "internal" }));
  }
});

// Bind internal API to loopback by default so it's only reachable from inside the container
const INTERNAL_HOST = process.env.INTERNAL_HOST || "127.0.0.1";
server.listen(INTERNAL_PORT, INTERNAL_HOST, () => {
  logger.info(
    `Internal API server listening on ${INTERNAL_HOST}:${INTERNAL_PORT}`,
  );
});
