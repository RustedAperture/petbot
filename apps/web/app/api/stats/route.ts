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
  if (!raw) return null;

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
  if (internalSecret) headers["x-internal-api-key"] = internalSecret;

  function getInternalApiBase() {
    if (process.env.INTERNAL_API_URL)
      return process.env.INTERNAL_API_URL.replace(/\/$/, "");
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
  if (!session)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Validate and authorize requested params
  const allowed = new URLSearchParams();

  if (userId) {
    if (!/^\d+$/.test(userId))
      return NextResponse.json({ error: "invalid_userId" }, { status: 400 });
    if (userId !== session.user.id)
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    allowed.set("userId", userId);
  }

  if (guildId) {
    if (!/^\d+$/.test(guildId))
      return NextResponse.json({ error: "invalid_guildId" }, { status: 400 });

    const isMember =
      Array.isArray(session.guilds) &&
      session.guilds.some((g) => g.id === guildId);

    // Allow if the session user is a member, OR if this is a user‑scoped request
    // (client provided userId and it matches the session user). In the latter
    // case the backend `/api/stats` will perform the DB presence check and
    // return 404 if the user has no rows for that location.
    const isUserScoped = Boolean(userId && userId === session.user.id);

    if (!isMember && !isUserScoped)
      return NextResponse.json({ error: "forbidden" }, { status: 403 });

    allowed.set("guildId", guildId);
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
