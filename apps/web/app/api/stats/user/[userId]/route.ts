import { NextResponse } from "next/server";
import {
  readCookie,
  getInternalApiBase,
  internalApiHeadersOptional,
} from "../../../../../lib/internal-api";

function readSession(raw: string) {
  try {
    return JSON.parse(raw) as { user: { id: string } };
  } catch {
    return null;
  }
}

/**
 * GET /api/stats/user/:userId — user-scoped stats.
 * Only allows the session user to fetch their own stats.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const raw = readCookie(req);
  if (!raw) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const session = readSession(raw);
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

  const target = `${getInternalApiBase()}/api/stats/user/${encodeURIComponent(userId)}`;
  const res = await fetch(target, { headers: internalApiHeadersOptional() });
  const text = await res.text();
  try {
    const json = JSON.parse(text);
    return NextResponse.json(json, { status: res.status });
  } catch {
    return new NextResponse(text, { status: res.status });
  }
}
