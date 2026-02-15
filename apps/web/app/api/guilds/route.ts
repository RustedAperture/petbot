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

export async function GET(req: Request) {
  // protect endpoint: require a session cookie
  const raw = readCookie(req);
  if (!raw)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const qs = url.search || "";
  const internalSecret = process.env.INTERNAL_API_SECRET;

  const headers: Record<string, string> = {};
  if (internalSecret) headers["x-internal-api-key"] = internalSecret;

  const res = await fetch(`http://localhost:3001/api/guilds${qs}`, {
    headers,
  });

  const text = await res.text();
  try {
    const json = JSON.parse(text);
    return NextResponse.json(json, { status: res.status });
  } catch {
    return new NextResponse(text, { status: res.status });
  }
}
