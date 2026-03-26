import { NextResponse } from "next/server";
import {
  readCookie,
  getInternalApiBase,
  internalApiHeadersOptional,
} from "../../../../../../../lib/internal-api";

function readSession(raw: string) {
  try {
    return JSON.parse(raw) as {
      user: { id: string };
      guilds?: Array<{ id: string }>;
    };
  } catch {
    return null;
  }
}

async function fetchGuilds(userId: string) {
  try {
    const res = await fetch(
      `${getInternalApiBase()}/api/userSessions/${encodeURIComponent(userId)}`,
      { headers: internalApiHeadersOptional() },
    );
    if (res.ok) {
      const json = (await res.json()) as { guilds?: Array<{ id: string }> };
      if (Array.isArray(json.guilds)) return json.guilds;
    }
  } catch {
    // ignore
  }
  return undefined;
}

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
  const raw = readCookie(req);
  if (!raw) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const session = readSession(raw);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { userId, guildId } = await params;
  const url = new URL(req.url);
  const userScoped = url.searchParams.get("userScoped") === "true";

  if (!/^\d+$/.test(userId)) {
    return NextResponse.json({ error: "invalid_userId" }, { status: 400 });
  }
  if (!/^\d+$/.test(guildId)) {
    return NextResponse.json({ error: "invalid_guildId" }, { status: 400 });
  }
  if (userId !== session.user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const guilds = session.guilds ?? (await fetchGuilds(userId));
  const isMember =
    Array.isArray(guilds) && guilds.some((g) => g.id === guildId);
  if (!isMember) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const headers = internalApiHeadersOptional();

  if (userScoped) {
    const target = `${getInternalApiBase()}/api/stats/user/${encodeURIComponent(userId)}/guild/${encodeURIComponent(guildId)}`;
    const res = await fetch(target, { headers });
    const text = await res.text();
    try {
      const json = JSON.parse(text);
      return NextResponse.json(json, { status: res.status });
    } catch {
      return new NextResponse(text, { status: res.status });
    }
  }

  // Legacy DM behavior: presence check then guild-level aggregates
  const presenceCheckUrl = `${getInternalApiBase()}/api/stats/user/${encodeURIComponent(userId)}/guild/${encodeURIComponent(guildId)}`;
  const presenceResp = await fetch(presenceCheckUrl, { headers });

  if (presenceResp.status === 404) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (!presenceResp.ok) {
    const text = await presenceResp.text();
    try {
      const json = JSON.parse(text);
      return NextResponse.json(json, { status: presenceResp.status });
    } catch {
      return new NextResponse(text, { status: presenceResp.status });
    }
  }

  const forwardUrl = `${getInternalApiBase()}/api/stats/guild/${encodeURIComponent(guildId)}`;
  const forwardResp = await fetch(forwardUrl, { headers });
  const forwardText = await forwardResp.text();
  try {
    const json = JSON.parse(forwardText);
    return NextResponse.json(json, { status: forwardResp.status });
  } catch {
    return new NextResponse(forwardText, { status: forwardResp.status });
  }
}
