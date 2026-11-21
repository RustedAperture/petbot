import { requireSession, resolveGuilds, type Session } from "../../../lib/auth";
import {
  getInternalApiBase,
  internalApiHeadersOptional,
} from "../../../lib/internal-api";
import { apiError } from "../../../lib/errors";

/** Whether the bot is in the guild; null when the bot cannot be reached. */
async function fetchIsBotGuild(guildId: string): Promise<boolean | null> {
  try {
    const res = await fetch(
      `${getInternalApiBase()}/api/guilds/bot/${encodeURIComponent(guildId)}`,
      { headers: internalApiHeadersOptional() },
    );
    if (!res.ok) {
      return null;
    }
    const json = (await res.json()) as { isBotGuild?: boolean };
    return Boolean(json.isBotGuild);
  } catch {
    return null;
  }
}

/** A non-guild location is only visible to users who have activity in it. */
async function isDmParticipant(
  userId: string,
  locationId: string,
): Promise<boolean> {
  try {
    const res = await fetch(
      `${getInternalApiBase()}/api/stats/user/${encodeURIComponent(userId)}/location/${encodeURIComponent(locationId)}`,
      { headers: internalApiHeadersOptional() },
    );
    if (!res.ok) {
      return false;
    }
    const stats = (await res.json()) as {
      totalsByAction?: Record<
        string,
        { totalHasPerformed?: number; totalHasReceived?: number }
      >;
    };
    return Object.values(stats.totalsByAction ?? {}).some(
      (t) => (t.totalHasPerformed ?? 0) > 0 || (t.totalHasReceived ?? 0) > 0,
    );
  } catch {
    return false;
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const locationId = url.searchParams.get("locationId");
    const actionType = url.searchParams.get("actionType");
    const limit = url.searchParams.get("limit") ?? "10";

    const scope = url.searchParams.get("scope");

    let session: Session | null = null;
    try {
      session = requireSession(req);
    } catch (error) {
      // Only global results are public. Invalid sessions behave like guests.
      if (
        locationId ||
        scope === "guild" ||
        !(error instanceof Response) ||
        error.status !== 401
      ) {
        throw error;
      }
    }
    const currentUserId = session?.user?.id;

    // The bot picks guild custom actions from locationId alone, so the
    // location is authorized here regardless of the client's scope label.
    if (locationId && session) {
      const guilds = await resolveGuilds(session);
      const isGuildMember = guilds.some((g) => g.id === locationId);
      if (!isGuildMember) {
        // The client's scope label never decides the location type: a guild
        // the bot is in stays closed to non-members whatever activity they have.
        const isBotGuild = (await fetchIsBotGuild(locationId)) !== false;
        const isAllowed =
          !isBotGuild && (await isDmParticipant(session.user!.id!, locationId));
        if (!isAllowed) {
          throw apiError(403, "forbidden");
        }
      }
    }

    const params = new URLSearchParams({ limit });
    if (locationId) {
      params.set("locationId", locationId);
    }
    if (actionType) {
      params.set("actionType", actionType);
    }
    if (currentUserId) {
      params.set("currentUserId", currentUserId);
    }

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

    const data = (await res.json()) as {
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
      isCurrentUser: Boolean(currentUserId && userId === currentUserId),
    }));

    return Response.json({ ...data, entries });
  } catch (res) {
    if (res instanceof Response) {
      return res;
    }
    throw res;
  }
}
