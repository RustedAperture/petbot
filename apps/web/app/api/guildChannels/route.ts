import { NextResponse } from "next/server";
import { readCookie, getInternalApiBase } from "../../../lib/internal-api";

export async function GET(req: Request) {
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

  const userId = session?.user?.id;
  if (!userId || !/^\d+$/.test(userId)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  let guildId = url.searchParams.get("guildId");
  let targetUserId = url.searchParams.get("userId") || userId;

  if (!guildId || !targetUserId) {
    const pathMatch = url.pathname.match(
      /^\/api\/guildChannels\/([^/]+)\/user\/([^/]+)$/,
    );
    if (pathMatch) {
      guildId = guildId || decodeURIComponent(pathMatch[1]);
      targetUserId = targetUserId || decodeURIComponent(pathMatch[2]);
    }
  }

  if (!guildId) {
    return NextResponse.json(
      { error: "missing parameter: guildId" },
      { status: 400 },
    );
  }

  const internalSecret = process.env.INTERNAL_API_SECRET;
  const headers: Record<string, string> = {};
  if (internalSecret) {
    headers["x-internal-api-key"] = internalSecret;
  }

  const target = `${getInternalApiBase()}/api/guildChannels?guildId=${encodeURIComponent(
    guildId,
  )}&userId=${encodeURIComponent(targetUserId)}`;

  const res = await fetch(target, { headers });
  const text = await res.text();

  try {
    const json = JSON.parse(text);
    return NextResponse.json(json, { status: res.status });
  } catch {
    return new NextResponse(text, { status: res.status });
  }
}
