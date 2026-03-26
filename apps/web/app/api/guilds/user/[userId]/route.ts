import { NextResponse } from "next/server";
import {
  readCookie,
  getInternalApiBase,
  internalApiHeadersOptional,
} from "../../../../../lib/internal-api";

/**
 * GET /api/guilds/user/:userId — proxy to internal API.
 * Only allows the session user to fetch their own guilds.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
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

  const { userId } = await params;

  // Authorization: only allow fetching your own guilds
  if (userId !== sessionUserId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const target = `${getInternalApiBase()}/api/guilds/user/${encodeURIComponent(userId)}`;
  const res = await fetch(target, { headers: internalApiHeadersOptional() });

  const text = await res.text();
  try {
    const json = JSON.parse(text);
    return NextResponse.json(json, { status: res.status });
  } catch {
    return new NextResponse(text, { status: res.status });
  }
}
