import { requireSession, assertSelf, resolveGuilds } from "./auth";
import { proxyRequest } from "./proxy";
import { getInternalApiBase, internalApiHeadersOptional } from "./internal-api";
import { apiError } from "./errors";

export type EventsMode = "recent" | "stream";

export type EventsScope = {
  guildId?: string;
  userId?: string;
  locationId?: string;
};

/** Pipes the bot's SSE stream to the browser; aborts upstream when the client disconnects. */
export async function relayEventStream(
  req: Request,
  botPath: string,
): Promise<Response> {
  let upstream: Response;
  try {
    upstream = await fetch(`${getInternalApiBase()}${botPath}`, {
      headers: internalApiHeadersOptional(),
      signal: req.signal,
    });
  } catch {
    return apiError(503, "upstream_unavailable");
  }
  if (!upstream.ok || !upstream.body) {
    return apiError(503, "upstream_unavailable");
  }
  return new Response(upstream.body, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      "x-accel-buffering": "no",
    },
  });
}

function requireNumeric(name: keyof EventsScope, value: string | undefined) {
  if (value !== undefined && !/^\d+$/.test(value)) {
    throw apiError(400, `invalid_${name}`);
  }
}

/** Applies the access checks for the scope, then forwards to the bot's recent or stream endpoint. */
export async function relayEvents(
  req: Request,
  mode: EventsMode,
  scope: EventsScope = {},
): Promise<Response> {
  try {
    const { guildId, userId, locationId } = scope;
    const isScoped = guildId !== undefined || userId !== undefined;

    if (isScoped) {
      const session = requireSession(req);
      requireNumeric("guildId", guildId);
      requireNumeric("userId", userId);
      requireNumeric("locationId", locationId);
      if (userId !== undefined) {
        assertSelf(session, userId);
      }
      if (guildId !== undefined) {
        const guilds = await resolveGuilds(session);
        if (!guilds.some((g) => g.id === guildId)) {
          throw apiError(403, "forbidden");
        }
      }
    }

    const query = new URLSearchParams();
    if (userId !== undefined) {
      query.set("userId", userId);
    }
    const botLocationId = guildId ?? locationId;
    if (botLocationId !== undefined) {
      query.set("locationId", botLocationId);
    }
    const qs = query.size > 0 ? `?${query}` : "";
    const botPath = `/api/events/${mode}${qs}`;

    return mode === "stream"
      ? await relayEventStream(req, botPath)
      : await proxyRequest(botPath);
  } catch (res) {
    if (res instanceof Response) {
      return res;
    }
    throw res;
  }
}
