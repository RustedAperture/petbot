import { requireSession, assertSelf, resolveGuilds } from "./auth";
import { proxyRequest } from "./proxy";
import { getInternalApiBase, internalApiHeadersOptional } from "./internal-api";
import { apiError } from "./errors";

export type EventsMode = "recent" | "stream";

/** `locationId` is only valid with `userId`; guild scope has its own location. */
export type EventsScope =
  | { guildId?: never; userId?: never; locationId?: never }
  | { guildId: string; userId?: never; locationId?: never }
  | { guildId?: never; userId: string; locationId?: string };

const SSE_HEADERS = {
  "content-type": "text/event-stream",
  "cache-control": "no-cache, no-transform",
  "x-accel-buffering": "no",
};

/** Pipes the bot's SSE stream to the browser; aborts upstream when the client disconnects. */
export async function relayEventStream(
  req: Request,
  botPath: string,
): Promise<Response> {
  // Next runs GET for HEAD and never aborts req.signal, which would leave the upstream stream open.
  if (req.method === "HEAD") {
    return new Response(null, { headers: SSE_HEADERS });
  }
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
    headers: SSE_HEADERS,
  });
}

function requireNumeric(name: "guildId" | "userId" | "locationId", value: string | undefined) {
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
