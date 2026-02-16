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

  // Enforce userId from the validated session cookie (ignore any query param)
  if (!/^\d+$/.test(raw)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const allowed = new URLSearchParams();
  allowed.set("userId", raw);

  const internalSecret = process.env.INTERNAL_API_SECRET;
  const headers: Record<string, string> = {};
  if (internalSecret) headers["x-internal-api-key"] = internalSecret;

  const targetBase = `http://localhost:${process.env.HTTP_PORT || 3001}/api/guilds`;
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
