import { NextResponse } from "next/server";
import { ACTIONS } from "@petbot/constants";

function readCookie(req: Request) {
  const cookieHeader = req.headers.get("cookie") || "";
  const cookies = Object.fromEntries(
    cookieHeader.split(";").map((c) => {
      const [k, ...v] = c.split("=");
      return [k?.trim(), decodeURIComponent((v || []).join("=") || "")];
    }),
  );
  return cookies["petbot_session"];
}

function getInternalApiBase() {
  if (process.env.INTERNAL_API_URL) {
    return process.env.INTERNAL_API_URL.replace(/\/$/, "");
  }
  const host = process.env.HTTP_HOST || "127.0.0.1";
  const port = process.env.HTTP_PORT || "3001";
  const preferHttps = Boolean(
    process.env.HTTP_TLS_CERT ||
    process.env.HTTP_TLS_KEY ||
    process.env.INTERNAL_API_USE_HTTPS === "1" ||
    process.env.INTERNAL_API_USE_HTTPS === "true" ||
    process.env.NODE_ENV === "production",
  );
  const protocol =
    preferHttps && host !== "127.0.0.1" && host !== "localhost"
      ? "https"
      : "http";
  return `${protocol}://${host}:${port}`;
}

export async function POST(req: Request) {
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

  let body: {
    guildId?: unknown;
    actionType?: unknown;
    images?: unknown;
    everywhere?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { guildId, actionType, images, everywhere } = body;

  if (typeof actionType !== "string" || !(actionType in ACTIONS)) {
    return NextResponse.json({ error: "invalid_actionType" }, { status: 400 });
  }

  const MAX_URL_LENGTH = 2048;
  const ALLOWED_SCHEMES = /^https?:\/\//i;
  if (
    !Array.isArray(images) ||
    images.length > 4 ||
    images.some(
      (img) =>
        typeof img !== "string" ||
        (img !== "" &&
          (!ALLOWED_SCHEMES.test(img) || img.length > MAX_URL_LENGTH)),
    )
  ) {
    return NextResponse.json({ error: "invalid_images" }, { status: 400 });
  }

  const isEverywhere = Boolean(everywhere);
  if (
    !isEverywhere &&
    (typeof guildId !== "string" || !/^\d+$/.test(guildId))
  ) {
    return NextResponse.json({ error: "invalid_guildId" }, { status: 400 });
  }

  const internalSecret = process.env.INTERNAL_API_SECRET;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (internalSecret) {
    headers["x-internal-api-key"] = internalSecret;
  }

  const payload = {
    userId,
    guildId,
    actionType,
    images,
    everywhere: isEverywhere,
  };

  const res = await fetch(`${getInternalApiBase()}/api/setImages`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  try {
    const json = JSON.parse(text);
    return NextResponse.json(json, { status: res.status });
  } catch {
    return new NextResponse(text, { status: res.status });
  }
}
