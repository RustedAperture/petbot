import { NextResponse } from "next/server";

function readCookie(req: Request) {
  const cookieHeader = req.headers.get("cookie") || "";
  const cookies = Object.fromEntries(
    cookieHeader
      .split(";")
      .map((c) => c.split("=").map((s) => s.trim()))
      .map(([k, v]) => [k, decodeURIComponent(v || "")]),
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

function extractUserId(req: Request): string | null {
  const raw = readCookie(req);
  if (!raw) return null;
  try {
    const sess = JSON.parse(raw) as { user?: { id?: string } };
    const id = sess?.user?.id;
    if (id && /^[0-9]+$/.test(id)) return id;
  } catch {
    // ignore
  }
  return null;
}

async function proxy(
  userId: string,
  method: string,
  headers: Record<string, string>,
) {
  const target = `${getInternalApiBase()}/api/optOut?userId=${encodeURIComponent(userId)}`;
  const res = await fetch(target, { method, headers });
  const text = await res.text();
  try {
    return NextResponse.json(JSON.parse(text), { status: res.status });
  } catch {
    return new NextResponse(text, { status: res.status });
  }
}

export async function GET(req: Request) {
  const userId = extractUserId(req);
  if (!userId)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const internalSecret = process.env.INTERNAL_API_SECRET;
  const headers: Record<string, string> = internalSecret
    ? { "x-internal-api-key": internalSecret }
    : {};
  return proxy(userId, "GET", headers);
}

export async function POST(req: Request) {
  const userId = extractUserId(req);
  if (!userId)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const internalSecret = process.env.INTERNAL_API_SECRET;
  const headers: Record<string, string> = internalSecret
    ? { "x-internal-api-key": internalSecret }
    : {};
  return proxy(userId, "POST", headers);
}

export async function DELETE(req: Request) {
  const userId = extractUserId(req);
  if (!userId)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const internalSecret = process.env.INTERNAL_API_SECRET;
  const headers: Record<string, string> = internalSecret
    ? { "x-internal-api-key": internalSecret }
    : {};
  return proxy(userId, "DELETE", headers);
}
