import { requireSession, resolveGuilds } from "../../../lib/auth";
import { getInternalApiBase, internalApiHeadersOptional } from "../../../lib/internal-api";
import { apiError } from "../../../lib/errors";

export async function GET(req: Request) {
  try {
    const session = requireSession(req);
    const currentUserId = session.user!.id!;
    const url = new URL(req.url);
    const locationId = url.searchParams.get("locationId");
    const actionType = url.searchParams.get("actionType");
    const limit = url.searchParams.get("limit") ?? "10";

    if (locationId && /^\d+$/.test(locationId)) {
      const guilds = await resolveGuilds(session);
      if (!guilds.some((g) => g.id === locationId)) {
        throw apiError(403, "forbidden");
      }
    }

    const params = new URLSearchParams({ limit });
    if (locationId) params.set("locationId", locationId);
    if (actionType) params.set("actionType", actionType);
    params.set("currentUserId", currentUserId);

    const base = getInternalApiBase();
    const res = await fetch(`${base}/api/leaderboard?${params.toString()}`, {
      headers: internalApiHeadersOptional(),
    });

    if (!res.ok) {
      return Response.json(
        await res.json().catch(() => ({ error: "upstream_error" })),
        { status: res.status },
      );
    }

    const data = await res.json() as {
      locationId: string | null;
      actionType: string | null;
      entries: Array<{
        rank: number;
        userId: string;
        displayName: string | null;
        anonymousLabel: string;
        totalActions: number;
      }>;
    };

    const entries = data.entries.map(({ userId, ...entry }) => ({
      ...entry,
      isCurrentUser: userId === currentUserId,
    }));

    return Response.json({ ...data, entries });
  } catch (res) {
    if (res instanceof Response) return res;
    throw res;
  }
}
