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
    return JSON.parse(raw) as { user: { id: string } };
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
 * GET /api/stats/user/:userId — user-scoped stats.
 * Only allows the session user to fetch their own stats.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const session = readSession(req);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { userId } = await params;

  if (!/^\d+$/.test(userId)) {
    return NextResponse.json({ error: "invalid_userId" }, { status: 400 });
  }
  if (userId !== session.user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const internalSecret = process.env.INTERNAL_API_SECRET;
  const headers: Record<string, string> = {};
  if (internalSecret) {
    headers["x-internal-api-key"] = internalSecret;
  }

  const target = `${getInternalApiBase()}/api/stats/user/${encodeURIComponent(userId)}`;
  const res = await fetch(target, { headers });
  const text = await res.text();
  try {
    const json = JSON.parse(text);
    return NextResponse.json(json, { status: res.status });
  } catch {
    return new NextResponse(text, { status: res.status });
  }
}
