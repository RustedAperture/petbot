export * from "./src/deploy-commands.js";
const config = JSON.parse(
  fs.readFileSync(new URL("../config.json", import.meta.url), "utf8"),
);
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const slashCommands: ApplicationCommandData[] = [];
const contextCommands: ApplicationCommandData[] = [];
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const { clientId, token } = config as { clientId: string; token: string };

const foldersPath = path.join(__dirname, "commands");
const commandFolders = fs.readdirSync(foldersPath);

console.log("Listing commands and their directories:");
for (const folder of commandFolders) {
  console.log(`Directory: ${folder}`);

  const commandsPath = path.join(foldersPath, folder);
  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((file) => file.endsWith(".js"));
  console.log(`  - Files: ${commandFiles.join(", ")}`);

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const loaded = await import(pathToFileURL(filePath).href);
    const command = (loaded as any).default || loaded; // support default export
    if (command && "data" in command && "execute" in command) {
      const commandDataJSON = command.data.toJSON();
      console.log(
        `    - Command: ${commandDataJSON.name} (Type: ${commandDataJSON.type === ApplicationCommandType.User ? "Context" : "Slash"})`,
      );
      if (commandDataJSON.type === ApplicationCommandType.User) {
        contextCommands.push(commandDataJSON);
      } else {
        slashCommands.push(commandDataJSON);
      }
    } else {
      console.log(
        `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`,
      );
    }
  }
}

const commands: ApplicationCommandData[] = [
  ...slashCommands,
  ...contextCommands,
];

const rest = new REST().setToken(token);

(async () => {
  try {
    console.log(
      `Started refreshing ${commands.length} application (/) commands.`,
    );

    const data = (await rest.put(Routes.applicationCommands(clientId), {
      body: commands,
    })) as ApplicationCommandData[];

    console.log(
      `Successfully reloaded ${data.length} application (/) commands.`,
    );
  } catch (error) {
    console.error(error);
  }
})();
