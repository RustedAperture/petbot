import { NextResponse } from "next/server";
import {
  readCookie,
  getInternalApiBase,
  internalApiHeaders,
  internalApiHeadersOptional,
} from "../../../../../../lib/internal-api";
import { isAdminOrOwnerGuild } from "../../../../../../lib/utils";

type GuildInfo = {
  id: string;
  name?: string;
  owner?: boolean;
  permissions?: string | null;
};

type Session = {
  user?: { id?: string };
  guilds?: GuildInfo[];
};

function requireSession(req: Request): Session | null {
  const raw = readCookie(req);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Fetch guilds from internal API when cookie doesn't contain them. */
async function resolveGuilds(
  userId: string,
  sessionGuilds: Session["guilds"],
): Promise<GuildInfo[] | undefined> {
  if (Array.isArray(sessionGuilds)) return sessionGuilds;
  try {
    const guildsRes = await fetch(
      `${getInternalApiBase()}/api/userSessions/${encodeURIComponent(userId)}`,
      { headers: internalApiHeadersOptional() },
    );
    if (guildsRes.ok) {
      const json = (await guildsRes.json()) as { guilds?: GuildInfo[] };
      if (Array.isArray(json.guilds)) return json.guilds;
    }
  } catch {
    // ignore — authorization below will fail
  }
  return undefined;
}

export async function GET(req: Request, context: any) {
  const params = (await context?.params) || {};
  const guildId = params.guildId as string | undefined;
  const userId = params.userId as string | undefined;

  const session = requireSession(req);
  if (!session || !session.user?.id || !/^[0-9]+$/.test(session.user.id)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!guildId || !userId) {
    return NextResponse.json(
      { error: "missing parameter: guildId or userId" },
      { status: 400 },
    );
  }

  if (userId !== session.user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const guilds = await resolveGuilds(session.user.id, session.guilds);
  const guild = guilds?.find((g) => g.id === guildId);
  if (!guild) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (!isAdminOrOwnerGuild(guild)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let target: string;
  let headers: Record<string, string>;
  try {
    const base = getInternalApiBase();
    target = `${base}/api/serverSettings/${encodeURIComponent(guildId)}/userId/${encodeURIComponent(userId)}`;
    headers = {
      ...internalApiHeaders(),
      "content-type": "application/json",
    };
  } catch (err) {
    return NextResponse.json(
      { error: "server_configuration" },
      { status: 500 },
    );
  }

  let res: Response;
  try {
    res = await fetch(target, { headers });
  } catch (err) {
    return NextResponse.json(
      { error: "upstream_unavailable" },
      { status: 503 },
    );
  }

  const text = await res.text();
  const contentType = res.headers.get("content-type") ?? "application/json";

  return new NextResponse(text, {
    status: res.status,
    headers: { "content-type": contentType },
  });
}

export async function PATCH(req: Request, context: any) {
  const params = (await context?.params) || {};
  const guildId = params.guildId as string | undefined;
  const userId = params.userId as string | undefined;

  const session = requireSession(req);
  if (!session || !session.user?.id || !/^[0-9]+$/.test(session.user.id)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!guildId || !userId) {
    return NextResponse.json(
      { error: "missing parameter: guildId or userId" },
      { status: 400 },
    );
  }

  if (userId !== session.user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const guilds = await resolveGuilds(session.user.id, session.guilds);
  const guild = guilds?.find((g) => g.id === guildId);
  if (!guild) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (!isAdminOrOwnerGuild(guild)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      { error: "invalid_payload", reason: "body_must_be_object" },
      { status: 400 },
    );
  }

  let target: string;
  let headers: Record<string, string>;
  try {
    const base = getInternalApiBase();
    target = `${base}/api/serverSettings/${encodeURIComponent(guildId)}/userId/${encodeURIComponent(userId)}`;
    headers = {
      ...internalApiHeaders(),
      "content-type": "application/json",
    };
  } catch (err) {
    return NextResponse.json(
      { error: "server_configuration" },
      { status: 500 },
    );
  }

  let res: Response;
  try {
    res = await fetch(target, {
      method: "PATCH",
      headers,
      body: JSON.stringify(body),
    });
  } catch (err) {
    return NextResponse.json(
      { error: "upstream_unavailable" },
      { status: 503 },
    );
  }

  const text = await res.text();
  const contentType = res.headers.get("content-type") ?? "application/json";

  return new NextResponse(text, {
    status: res.status,
    headers: { "content-type": contentType },
  });
}
