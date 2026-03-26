import { NextResponse } from "next/server";

function readCookie(req: Request) {
  const cookieHeader = req.headers.get("cookie") || "";
  const cookies = Object.fromEntries(
    cookieHeader.split(";").map((c) => {
      const [k, ...v] = c.split("=");
      return [k?.trim(), decodeURIComponent((v || []).join("=") || "")];
    }),
  );
  return cookies["petbot_session"];
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

function getSessionAndAuth(
  req: Request,
  userId: string,
): { sessionUserId: string } | NextResponse {
  const raw = readCookie(req);
  if (!raw) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let session: { user?: { id?: string } } | null = null;
  try {
    session = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const sessionUserId = session?.user?.id;
  if (!sessionUserId || !/^\d+$/.test(sessionUserId)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Authorization: only allow managing your own sessions
  if (userId !== sessionUserId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  return { sessionUserId };
}

/**
 * GET /api/userSessions/:userId — proxy to internal API.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params;
  const auth = getSessionAndAuth(req, userId);
  if (auth instanceof NextResponse) return auth;

  const internalSecret = process.env.INTERNAL_API_SECRET;
  const headers: Record<string, string> = {};
  if (internalSecret) {
    headers["x-internal-api-key"] = internalSecret;
  }

  const target = `${getInternalApiBase()}/api/userSessions/${encodeURIComponent(userId)}`;
  const res = await fetch(target, { headers });
  const text = await res.text();
  try {
    const json = JSON.parse(text);
    return NextResponse.json(json, { status: res.status });
  } catch {
    return new NextResponse(text, { status: res.status });
  }
}

/**
 * DELETE /api/userSessions/:userId — proxy to internal API.
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params;
  const auth = getSessionAndAuth(req, userId);
  if (auth instanceof NextResponse) return auth;

  const internalSecret = process.env.INTERNAL_API_SECRET;
  const headers: Record<string, string> = {};
  if (internalSecret) {
    headers["x-internal-api-key"] = internalSecret;
  }

  const target = `${getInternalApiBase()}/api/userSessions/${encodeURIComponent(userId)}`;
  const res = await fetch(target, { method: "DELETE", headers });
  const text = await res.text();
  try {
    const json = JSON.parse(text);
    return NextResponse.json(json, { status: res.status });
  } catch {
    return new NextResponse(text, { status: res.status });
  }
}
