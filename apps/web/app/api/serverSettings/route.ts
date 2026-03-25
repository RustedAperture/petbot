import { NextResponse } from "next/server";
import {
  readCookie,
  getInternalApiBase,
  internalApiHeaders,
} from "../../../lib/internal-api";

function requireSession(req: Request) {
  const raw = readCookie(req);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as {
      user?: { id?: string };
      guilds?: Array<{ id: string; name: string }>;
    };
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const session = requireSession(req);
  if (!session || !session.user?.id || !/^[0-9]+$/.test(session.user.id)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const guildId = url.searchParams.get("guildId");
  const userId = url.searchParams.get("userId");

  if (!guildId || !userId) {
    return NextResponse.json(
      { error: "missing parameter: guildId or userId" },
      { status: 400 },
    );
  }

  const target = `${getInternalApiBase()}/api/serverSettings?guildId=${encodeURIComponent(
    guildId,
  )}&userId=${encodeURIComponent(userId)}`;

  const res = await fetch(target, {
    headers: {
      ...internalApiHeaders(),
      "content-type": "application/json",
    },
  });

  const text = await res.text();
  const contentType = res.headers.get("content-type") ?? "application/json";

  return new NextResponse(text, {
    status: res.status,
    headers: { "content-type": contentType },
  });
}

export async function PATCH(req: Request) {
  const session = requireSession(req);
  if (!session || !session.user?.id || !/^[0-9]+$/.test(session.user.id)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const guildId = url.searchParams.get("guildId");
  const userId = url.searchParams.get("userId");

  if (!guildId || !userId) {
    return NextResponse.json(
      { error: "missing parameter: guildId or userId" },
      { status: 400 },
    );
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      { error: "invalid_payload", reason: "body_must_be_object" },
      { status: 400 },
    );
  }

  const target = `${getInternalApiBase()}/api/serverSettings?guildId=${encodeURIComponent(
    guildId,
  )}&userId=${encodeURIComponent(userId)}`;

  const res = await fetch(target, {
    method: "PATCH",
    headers: {
      ...internalApiHeaders(),
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  const contentType = res.headers.get("content-type") ?? "application/json";

  return new NextResponse(text, {
    status: res.status,
    headers: { "content-type": contentType },
  });
}
