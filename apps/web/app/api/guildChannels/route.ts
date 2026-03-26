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
  // Always use the authenticated session user id as the target user.
  // Do NOT allow clients to supply an arbitrary `userId` to impersonate
  // another user — that would allow privilege escalation.
  let targetUserId = userId;

  if (!guildId || !targetUserId) {
    const pathMatch = url.pathname.match(
      /^\/api\/guildChannels\/([^/]+)\/user\/([^/]+)$/,
    );
    if (pathMatch) {
      guildId = guildId || decodeURIComponent(pathMatch[1]);
      // ignore path-supplied userId and always use session user id
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

  const target = `${getInternalApiBase()}/api/guildChannels/${encodeURIComponent(guildId)}/user/${encodeURIComponent(targetUserId)}`;

  const res = await fetch(target, { headers });
  const text = await res.text();

  try {
    const json = JSON.parse(text);
    // If upstream returned a server error, strip internal `details` from the
    // proxied response in production so sensitive internal information isn't
    // exposed to end users via the browser devtools.
    if (res.status >= 500 && json && typeof json === "object") {
      if (process.env.NODE_ENV === "production") {
        // remove details field when in production
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete (json as Record<string, unknown>).details;
      }
    }

    return NextResponse.json(json, { status: res.status });
  } catch {
    return new NextResponse(text, { status: res.status });
  }
}
