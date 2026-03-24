import { isGuildAdmin } from "../../utilities/helper.js";
import { Client, ChannelType, TextChannel } from "discord.js";
import http from "node:http";

export default async function guildChannelsHandler(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  client: Client<boolean>,
) {
  if (req.method !== "GET") {
    res.writeHead(405, { "Content-Type": "application/json", Allow: "GET" });
    res.end(JSON.stringify({ error: "method_not_allowed" }));
    return;
  }

  try {
    const url = new URL(
      req.url || "",
      `http://${req.headers.host || "localhost"}`,
    );

    let guildId = url.searchParams.get("guildId");
    let userId = url.searchParams.get("userId");

    // Support REST-style path /api/guildChannels/:guildId/user/:userId
    if (!guildId || !userId) {
      const restMatch = url.pathname.match(
        /^\/api\/guildChannels\/([^/]+)\/user\/([^/]+)$/,
      );
      if (restMatch) {
        guildId = decodeURIComponent(restMatch[1]);
        userId = decodeURIComponent(restMatch[2]);
      }
    }

    if (!guildId || !userId) {
      const missingParam = !guildId ? "guildId" : "userId";
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: `missing parameter: ${missingParam}` }));
      return;
    }

    const isAdmin = await isGuildAdmin(client, guildId, userId);
    if (!isAdmin) {
      res.writeHead(403, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "forbidden" }));
      return;
    }

    const guild = await client.guilds.fetch(guildId);
    if (!guild) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "guild_not_found" }));
      return;
    }

    const channels = await guild.channels.fetch();
    const textChannels = Array.from(channels.values())
      .filter((c): c is TextChannel => !!c && c.type === ChannelType.GuildText)
      .map((c) => ({ id: c.id, name: c.name }));

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ channels: textChannels }));
  } catch (err) {
    // Log the internal error for server-side visibility.
    // Only include raw error details in responses when not running in production.
    // This prevents leaking internal hostnames, DB strings, or API errors to clients.
    // Always return a generic error payload to the client in production.
    // Keep details in non-production environments to aid debugging.

    console.error(err);
    const body: Record<string, unknown> = { error: "server_error" };
    if (process.env.NODE_ENV !== "production") {
      body.details = err instanceof Error ? err.message : String(err);
    }

    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify(body));
  }
}
