import { NextResponse } from "next/server";

const COOKIE_NAME = "petbot_session";

function readCookie(req: Request) {
  const cookieHeader = req.headers.get("cookie") || "";
  const cookies = Object.fromEntries(
    cookieHeader.split(";").map((c) => {
      const [k, ...v] = c.split("=");
      return [k?.trim(), decodeURIComponent((v || []).join("=") || "")];
    }),
  );
  return cookies[COOKIE_NAME];
}

export async function GET(req: Request) {
  const raw = readCookie(req);
  if (!raw) return NextResponse.json({ session: null });

  try {
    const session = JSON.parse(raw);

    // Augment session with server‑persisted guilds (if any)
    try {
      const userId = session?.user?.id;
      if (userId) {
        const internalBase =
          process.env.INTERNAL_API_URL ||
          `${process.env.HTTP_TLS_CERT || process.env.HTTP_TLS_KEY || process.env.NODE_ENV === "production" ? "https" : "http"}://${process.env.HTTP_HOST || "127.0.0.1"}:${process.env.HTTP_PORT || "3001"}`;
        const headers: Record<string, string> = {};
        if (process.env.INTERNAL_API_SECRET)
          headers["x-internal-api-key"] = process.env.INTERNAL_API_SECRET;
        const res = await fetch(
          `${internalBase}/api/userSessions?userId=${encodeURIComponent(userId)}`,
          { headers },
        );
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json.guilds)) session.guilds = json.guilds;
        }
      }
    } catch (err) {
      // non-fatal: return session without guilds
      console.warn("failed to fetch persisted user guilds:", err);
    }

    return NextResponse.json({ session });
  } catch (err) {
    return NextResponse.json({ session: null });
  }
}
