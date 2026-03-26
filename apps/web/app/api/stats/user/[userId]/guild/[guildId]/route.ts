import { NextResponse } from "next/server";

function readSession(req: Request) {
  const cookieHeader = req.headers.get("cookie") || "";
  const cookies = Object.fromEntries(
    cookieHeader.split(";").map((c) => {
      const [k, ...v] = c.split("=");
      return [k?.trim(), decodeURIComponent((v || []).join("=") || "")];
    }),
  );
  const raw = cookies["petbot_session"];
  if (!raw) return null;
  try {
    return JSON.parse(raw) as {
      user: { id: string };
      guilds?: Array<{ id: string }>;
    };
  } catch {
    return null;
  }
}

function getInternalApiBase() {
  if (process.env.INTERNAL_API_URL) {
    return process.env.INTERNAL_API_URL.replace(/\/$/, "");
  }
  const host = process.env.HTTP_HOST || "127.0.0.1";
  const port = process.env.HTTP_PORT || "3001";
  const preferHttps = Boolean(
    process.env.HTTP_TLS_CERT ||
    process.env.HTTP_TLS_KEY ||
    process.env.INTERNAL_API_USE_HTTPS === "1" ||
    process.env.INTERNAL_API_USE_HTTPS === "true" ||
    process.env.NODE_ENV === "production",
  );
  const protocol =
    preferHttps && host !== "127.0.0.1" && host !== "localhost"
      ? "https"
      : "http";
  return `${protocol}://${host}:${port}`;
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
  const session = readSession(req);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { userId, guildId } = await params;
  const url = new URL(req.url);
  const userScoped = url.searchParams.get("userScoped") === "true";

  // Validate params
  if (!/^\d+$/.test(userId)) {
    return NextResponse.json({ error: "invalid_userId" }, { status: 400 });
  }
  if (!/^\d+$/.test(guildId)) {
    return NextResponse.json({ error: "invalid_guildId" }, { status: 400 });
  }

  // Authorization: userId must match session
  if (userId !== session.user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Fetch guilds for authorization if not in session
  let guilds = session.guilds;
  if (!Array.isArray(guilds)) {
    try {
      const internalSecret = process.env.INTERNAL_API_SECRET;
      const headers: Record<string, string> = {};
      if (internalSecret) headers["x-internal-api-key"] = internalSecret;

      const res = await fetch(
        `${getInternalApiBase()}/api/userSessions/${encodeURIComponent(userId)}`,
        { headers },
      );
      if (res.ok) {
        const json = (await res.json()) as { guilds?: Array<{ id: string }> };
        if (Array.isArray(json.guilds)) guilds = json.guilds;
      }
    } catch {
      // ignore
    }
  }

  const isMember =
    Array.isArray(guilds) && guilds.some((g) => g.id === guildId);
  if (!isMember) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const internalSecret = process.env.INTERNAL_API_SECRET;
  const headers: Record<string, string> = {};
  if (internalSecret) {
    headers["x-internal-api-key"] = internalSecret;
  }

  if (userScoped) {
    // User-scoped: forward both userId+guildId to internal API
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

  // Presence exists — forward guild-only request (legacy cumulative stats)
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
