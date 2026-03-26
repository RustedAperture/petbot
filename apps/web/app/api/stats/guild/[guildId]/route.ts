import { NextResponse } from "next/server";
import {
  readCookie,
  getInternalApiBase,
  internalApiHeadersOptional,
} from "../../../../../lib/internal-api";

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
 * GET /api/stats/guild/:guildId — guild-scoped stats.
 * Requires session and guild membership.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ guildId: string }> },
) {
  const raw = readCookie(req);
  if (!raw) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const session = readSession(raw);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { guildId } = await params;

  if (!/^\d+$/.test(guildId)) {
    return NextResponse.json({ error: "invalid_guildId" }, { status: 400 });
  }

  const guilds = session.guilds ?? (await fetchGuilds(session.user.id));
  const isMember =
    Array.isArray(guilds) && guilds.some((g) => g.id === guildId);
  if (!isMember) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const target = `${getInternalApiBase()}/api/stats/guild/${encodeURIComponent(guildId)}`;
  const res = await fetch(target, { headers: internalApiHeadersOptional() });
  const text = await res.text();
  try {
    const json = JSON.parse(text);
    return NextResponse.json(json, { status: res.status });
  } catch {
    return new NextResponse(text, { status: res.status });
  }
}
