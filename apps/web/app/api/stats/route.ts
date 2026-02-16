import { NextResponse } from "next/server";

function readSession(req: Request) {
  const cookieHeader = req.headers.get("cookie") || "";
  const cookies = Object.fromEntries(
    cookieHeader
      .split(";")
      .map((c) => c.split("=").map((s) => s.trim()))
      .map(([k, v]) => [k, decodeURIComponent(v || "")]),
  );

  const raw = cookies["petbot_session"];
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as {
      user: {
        id: string;
        username: string;
        avatar?: string | null;
        avatarUrl?: string | null;
      };
      guilds: Array<{ id: string; name: string }>;
    };
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const incoming = url.searchParams;

  // Determine whether this is a filtered request (userId or guildId present).
  const userId = incoming.get("userId");
  const guildId = incoming.get("guildId") || incoming.get("locationId");
  const isFilteredRequest = Boolean(userId || guildId);

  const internalSecret = process.env.INTERNAL_API_SECRET;
  const headers: Record<string, string> = {};
  if (internalSecret) {
    headers["x-internal-api-key"] = internalSecret;
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

  const targetBase = `${getInternalApiBase()}/api/stats`;

  // If this is an unfiltered (global) stats request, allow public access.
  if (!isFilteredRequest) {
    const res = await fetch(targetBase, { headers });
    const text = await res.text();
    try {
      const json = JSON.parse(text);
      return NextResponse.json(json, { status: res.status });
    } catch {
      return new NextResponse(text, { status: res.status });
    }
  }

  // For filtered requests, require a valid session and enforce authorization.
  const session = readSession(req);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // If the cookie doesn't contain guilds (we now persist them server-side),
  // attempt to fetch persisted guilds for authorization checks.
  if (!Array.isArray(session.guilds)) {
    try {
      const res = await fetch(
        `${getInternalApiBase()}/api/userSessions?userId=${encodeURIComponent(session.user.id)}`,
        { headers },
      );
      if (res.ok) {
        const json: any = await res.json();
        if (Array.isArray(json.guilds)) {
          session.guilds = json.guilds;
        }
      }
    } catch (_) {
      // ignore — we'll treat missing guilds as an empty list below
    }
  }

  // Validate and authorize requested params
  const allowed = new URLSearchParams();
  const userScoped = incoming.get("userScoped") === "true";

  if (userId) {
    if (!/^\d+$/.test(userId)) {
      return NextResponse.json({ error: "invalid_userId" }, { status: 400 });
    }
    if (userId !== session.user.id) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    // only forward `userId` to the internal API when the client explicitly
    // requests user-scoped results via `userScoped=true` — otherwise the
    // presence-only (legacy DM) flow below will validate and forward a
    // guild-only request to preserve legacy behavior.
    if (userScoped) {
      allowed.set("userId", userId);
    }
  }

  if (guildId) {
    if (!/^\d+$/.test(guildId)) {
      return NextResponse.json({ error: "invalid_guildId" }, { status: 400 });
    }

    const isMember =
      Array.isArray(session.guilds) &&
      session.guilds.some((g) => g.id === guildId);

    // Allow if the session user is a member, OR if the provided `userId`
    // matches the session user. This gate only controls authorization; the
    // legacy DM vs explicit user‑scoped behavior is handled later.
    const isSessionUserMatch = Boolean(userId && userId === session.user.id);

    if (!isMember && !isSessionUserMatch) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    allowed.set("guildId", guildId);
  }

  // Legacy DM behavior: if the client supplied `userId` equal to the session
  // user but did NOT request `userScoped`, treat the `userId` as a validation
  // token (presence check). If the user has presence at the location, forward
  // only `guildId` (returning location-level aggregates). If no presence,
  // return 404.
  if (userId && userId === session.user.id && guildId && !userScoped) {
    const presenceCheckUrl = `${targetBase}?userId=${encodeURIComponent(session.user.id)}&guildId=${encodeURIComponent(guildId)}`;
    const presenceResp = await fetch(presenceCheckUrl, { headers });
    if (presenceResp.status === 404) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    // presence exists — forward the guild-only request (legacy cumulative stats)
    const forwardUrl = `${targetBase}?guildId=${encodeURIComponent(guildId)}`;
    const forwardResp = await fetch(forwardUrl, { headers });
    const forwardText = await forwardResp.text();
    try {
      const json = JSON.parse(forwardText);
      return NextResponse.json(json, { status: forwardResp.status });
    } catch {
      return new NextResponse(forwardText, { status: forwardResp.status });
    }
  }

  const target = allowed.toString()
    ? `${targetBase}?${allowed.toString()}`
    : targetBase;
  const res = await fetch(target, { headers });
  const text = await res.text();
  try {
    const json = JSON.parse(text);
    return NextResponse.json(json, { status: res.status });
  } catch {
    return new NextResponse(text, { status: res.status });
  }
}
