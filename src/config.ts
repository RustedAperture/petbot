import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

// Load .env (development) — safe in production where envs are provided
dotenv.config();

let fileConfig: Record<string, unknown> = {};
try {
  const raw = fs.readFileSync(path.resolve(process.cwd(), "config.json"), "utf8");
  fileConfig = JSON.parse(raw) as Record<string, unknown>;
} catch (err) {
  // no-op — legacy config.json is optional now
}

const token =
  process.env.DISCORD_TOKEN ||
  // legacy fallbacks (documented deprecation)
  (fileConfig && (fileConfig.token as string)) ||
  undefined;

const clientId =
  process.env.DISCORD_CLIENT_ID || (fileConfig && (fileConfig.clientId as string)) || undefined;

const guildId =
  process.env.DEFAULT_GUILD_ID || process.env.GUILD_ID || (fileConfig && (fileConfig.guildId as string)) || undefined;

if (!token) {
  // warn early — token is required at runtime but we don't throw here to keep startup messages readable
  // tests and CI can assert absence if they need to.
  // eslint-disable-next-line no-console
  console.warn("[DEPRECATION] config.json is deprecated — please set DISCORD_TOKEN and other config via environment variables or a .env file.");
}

export const DISCORD_TOKEN = token;
export const DISCORD_CLIENT_ID = clientId;
export const DEFAULT_GUILD_ID = guildId;

export default { token: DISCORD_TOKEN, clientId: DISCORD_CLIENT_ID, guildId: DEFAULT_GUILD_ID };
