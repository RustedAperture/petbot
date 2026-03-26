import { NextResponse } from "next/server";
import {
  readCookie,
  getInternalApiBase,
  internalApiHeaders,
} from "../../../lib/internal-api";
import { isAdminOrOwnerGuild } from "../../../lib/utils";

function requireSession(req: Request) {
  const raw = readCookie(req);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as {
      user?: { id?: string };
      guilds?: Array<{
        id: string;
        name?: string;
        owner?: boolean;
        permissions?: string | null;
      }>;
    };
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const session = requireSession(req);
  if (!session || !session.user?.id || !/^[0-9]+$/.test(session.user.id)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const guildId = url.searchParams.get("guildId");
  const userId = url.searchParams.get("userId");

  if (!guildId || !userId) {
    return NextResponse.json(
      { error: "missing parameter: guildId or userId" },
      { status: 400 },
    );
  }

  if (userId !== session.user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Fetch guilds from internal API (cookie only stores user object)
  let guilds = session.guilds;
  if (!Array.isArray(guilds)) {
    try {
      const base = getInternalApiBase();
      const headers = internalApiHeaders();
      const guildsRes = await fetch(
        `${base}/api/userSessions/${encodeURIComponent(session.user.id)}`,
        { headers },
      );
      if (guildsRes.ok) {
        const json = (await guildsRes.json()) as {
          guilds?: Array<{
            id: string;
            name?: string;
            owner?: boolean;
            permissions?: string | null;
          }>;
        };
        if (Array.isArray(json.guilds)) guilds = json.guilds;
      }
    } catch {
      // ignore — guilds stays undefined, authorization below will fail
    }
  }

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
    target = `${base}/api/serverSettings?guildId=${encodeURIComponent(
      guildId,
    )}&userId=${encodeURIComponent(userId)}`;
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

export async function PATCH(req: Request) {
  const session = requireSession(req);
  if (!session || !session.user?.id || !/^[0-9]+$/.test(session.user.id)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const guildId = url.searchParams.get("guildId");
  const userId = url.searchParams.get("userId");

  if (!guildId || !userId) {
    return NextResponse.json(
      { error: "missing parameter: guildId or userId" },
      { status: 400 },
    );
  }

  if (userId !== session.user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Fetch guilds from internal API (cookie only stores user object)
  let guilds = session.guilds;
  if (!Array.isArray(guilds)) {
    try {
      const base = getInternalApiBase();
      const headers = internalApiHeaders();
      const guildsRes = await fetch(
        `${base}/api/userSessions/${encodeURIComponent(session.user.id)}`,
        { headers },
      );
      if (guildsRes.ok) {
        const json = (await guildsRes.json()) as {
          guilds?: Array<{
            id: string;
            name?: string;
            owner?: boolean;
            permissions?: string | null;
          }>;
        };
        if (Array.isArray(json.guilds)) guilds = json.guilds;
      }
    } catch {
      // ignore — guilds stays undefined, authorization below will fail
    }
  }

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
    target = `${base}/api/serverSettings?guildId=${encodeURIComponent(
      guildId,
    )}&userId=${encodeURIComponent(userId)}`;
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
