import { NextResponse } from "next/server";
import {
  readCookie,
  getInternalApiBase,
  internalApiHeadersOptional,
} from "../../../../lib/internal-api";

function getSessionAndAuth(
  raw: string,
  userId: string,
): { sessionUserId: string } | NextResponse {
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
  const raw = readCookie(req);
  if (!raw) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { userId } = await params;
  const auth = getSessionAndAuth(raw, userId);
  if (auth instanceof NextResponse) return auth;

  const target = `${getInternalApiBase()}/api/userSessions/${encodeURIComponent(userId)}`;
  const res = await fetch(target, { headers: internalApiHeadersOptional() });
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
  const raw = readCookie(req);
  if (!raw) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { userId } = await params;
  const auth = getSessionAndAuth(raw, userId);
  if (auth instanceof NextResponse) return auth;

  const target = `${getInternalApiBase()}/api/userSessions/${encodeURIComponent(userId)}`;
  const res = await fetch(target, {
    method: "DELETE",
    headers: internalApiHeadersOptional(),
  });
  const text = await res.text();
  try {
    const json = JSON.parse(text);
    return NextResponse.json(json, { status: res.status });
  } catch {
    return new NextResponse(text, { status: res.status });
  }
}
