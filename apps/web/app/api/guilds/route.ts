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
  if (process.env.INTERNAL_API_URL) return process.env.INTERNAL_API_URL.replace(/\/$/, "");
  const host = process.env.HTTP_HOST || "127.0.0.1";
  const port = process.env.HTTP_PORT || "3001";
  const preferHttps = Boolean(
    process.env.HTTP_TLS_CERT ||
    process.env.HTTP_TLS_KEY ||
    process.env.INTERNAL_API_USE_HTTPS === "1" ||
    process.env.INTERNAL_API_USE_HTTPS === "true" ||
    process.env.NODE_ENV === "production",
  );
  const protocol = preferHttps && host !== "127.0.0.1" && host !== "localhost" ? "https" : "http";
  return `${protocol}://${host}:${port}`;
}

export async function GET(req: Request) {
  // protect endpoint: require a session cookie
  const raw = readCookie(req);
  if (!raw)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Parse session from cookie and extract userId
  let session: any = null;
  try {
    session = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const userId = session?.user?.id;
  if (!userId || !/^\d+$/.test(userId)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const allowed = new URLSearchParams();
  allowed.set("userId", userId);

  const internalSecret = process.env.INTERNAL_API_SECRET;
  const headers: Record<string, string> = {};
  if (internalSecret) headers["x-internal-api-key"] = internalSecret;

  const targetBase = `${getInternalApiBase()}/api/guilds`;
  const target = allowed.toString() ? `${targetBase}?${allowed.toString()}` : targetBase;

  const res = await fetch(target, { headers });

  const text = await res.text();
  try {
    const json = JSON.parse(text);
    return NextResponse.json(json, { status: res.status });
  } catch {
    return new NextResponse(text, { status: res.status });
  }
}
