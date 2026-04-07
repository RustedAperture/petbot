import { requireSession, resolveGuilds } from "../../../../../lib/auth";
import { proxyRequest } from "../../../../../lib/proxy";
import { apiError } from "../../../../../lib/errors";

/**
 * GET /api/stats/guild/:guildId — guild-scoped stats.
 * Requires session and guild membership.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ guildId: string }> },
) {
  try {
    const session = requireSession(req);
    const { guildId } = await params;

    if (!/^\d+$/.test(guildId)) {
      throw apiError(400, "invalid_guildId");
    }

    const guilds = await resolveGuilds(session);
    if (!guilds.some((g) => g.id === guildId)) {
      throw apiError(403, "forbidden");
    }

    return proxyRequest(`/api/stats/guild/${encodeURIComponent(guildId)}`);
  } catch (res) {
    if (res instanceof Response) {
      return res;
    }
    throw res;
  }
}
