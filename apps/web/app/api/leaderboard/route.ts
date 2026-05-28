import { requireSession, resolveGuilds } from "../../../lib/auth";
import { proxyRequest } from "../../../lib/proxy";
import { apiError } from "../../../lib/errors";

export async function GET(req: Request) {
  try {
    const session = requireSession(req);
    const url = new URL(req.url);
    const locationId = url.searchParams.get("locationId");
    const actionType = url.searchParams.get("actionType");
    const limit = url.searchParams.get("limit") ?? "10";

    // If locationId is provided and looks like a guild ID, check membership
    if (locationId && /^\d+$/.test(locationId)) {
      const guilds = await resolveGuilds(session);
      if (!guilds.some((g) => g.id === locationId)) {
        throw apiError(403, "forbidden");
      }
    }

    const params = new URLSearchParams({ limit });
    if (locationId) {
      params.set("locationId", locationId);
    }
    if (actionType) {
      params.set("actionType", actionType);
    }

    return proxyRequest(`/api/leaderboard?${params.toString()}`);
  } catch (res) {
    if (res instanceof Response) {
      return res;
    }
    throw res;
  }
}
