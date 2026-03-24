import { NextResponse } from "next/server";
import {
  readCookie,
  getInternalApiBase,
} from "../../../../../../lib/internal-api";

export async function GET(req: Request, context: any) {
  // `context.params` can be a plain object or a Promise depending on the
  // Next.js build/runtime types. Widen to `any` here and coerce to a usable
  // shape to avoid strict typing mismatches while preserving runtime checks.
  const params = (context && (context.params as any)) || {};
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

  let guildId = params?.guildId;
  // Always enforce the authenticated session's user id. Ignore any userId supplied
  // in the URL to prevent authorization bypass.
  const targetUserId = userId;

  if (!guildId) {
    try {
      const url = new URL(req.url);
      const pathMatch = url.pathname.match(
        /^\/api\/guildChannels\/([^/]+)\/user\/([^/]+)$/,
      );
      if (pathMatch) {
        guildId = guildId || decodeURIComponent(pathMatch[1]);
      }
    } catch {
      // ignore URL parse errors
    }
  }

  if (!guildId) {
    return NextResponse.json(
      { error: "missing parameter: guildId or userId" },
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
