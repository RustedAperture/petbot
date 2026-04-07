import { NextResponse } from "next/server";
import {
  getInternalApiBase,
  internalApiHeadersOptional,
} from "../../../../../../../lib/internal-api";
import {
  requireSession,
  assertSelf,
  resolveGuilds,
} from "../../../../../../../lib/auth";
import { apiError } from "../../../../../../../lib/errors";

/**
 * GET /api/stats/user/:userId/guild/:guildId — user + guild scoped stats.
 *
 * Query params:
 *   - userScoped=true → return user-scoped aggregates for this user+guild
 *   - (default)       → legacy DM behavior: presence check then guild-level stats
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ userId: string; guildId: string }> },
) {
  try {
    const session = requireSession(req);
    const { userId, guildId } = await params;
    assertSelf(session, userId);

    if (!/^\d+$/.test(guildId)) {
      throw apiError(400, "invalid_guildId");
    }

    const guilds = await resolveGuilds(session);
    if (!guilds.some((g) => g.id === guildId)) {
      throw apiError(403, "forbidden");
    }

    const url = new URL(req.url);
    const userScoped = url.searchParams.get("userScoped") === "true";
    const headers = internalApiHeadersOptional();

    if (userScoped) {
      const target = `${getInternalApiBase()}/api/stats/user/${encodeURIComponent(userId)}/guild/${encodeURIComponent(guildId)}`;
      const res = await fetch(target, { headers });
      const text = await res.text();
      try {
        return NextResponse.json(JSON.parse(text), { status: res.status });
      } catch {
        return new NextResponse(text, { status: res.status });
      }
    }

    // Legacy DM behavior: presence check then guild-level aggregates
    const presenceUrl = `${getInternalApiBase()}/api/stats/user/${encodeURIComponent(userId)}/guild/${encodeURIComponent(guildId)}`;
    const presenceResp = await fetch(presenceUrl, { headers });

    if (presenceResp.status === 404) {
      return apiError(404, "not_found");
    }

    if (!presenceResp.ok) {
      const text = await presenceResp.text();
      try {
        return NextResponse.json(JSON.parse(text), {
          status: presenceResp.status,
        });
      } catch {
        return new NextResponse(text, { status: presenceResp.status });
      }
    }

    const forwardUrl = `${getInternalApiBase()}/api/stats/guild/${encodeURIComponent(guildId)}`;
    const forwardResp = await fetch(forwardUrl, { headers });
    const forwardText = await forwardResp.text();
    try {
      return NextResponse.json(JSON.parse(forwardText), {
        status: forwardResp.status,
      });
    } catch {
      return new NextResponse(forwardText, { status: forwardResp.status });
    }
  } catch (res) {
    if (res instanceof Response) {
      return res;
    }
    throw res;
  }
}
