import { NextResponse } from "next/server";

const COOKIE_NAME = "petbot_session";

export async function GET(req: Request) {
  const siteUrl = new URL(
    "/",
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  );
  const secureAttr = siteUrl.protocol === "https:" ? "; Secure" : "";
  const cookie = `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secureAttr}`;

  // Best-effort: clear persisted server-side session for this user
  try {
    const cookieHeader = req.headers.get("cookie") || "";
    const cookies = Object.fromEntries(
      cookieHeader.split(";").map((c) => {
        const [k, ...v] = c.split("=");
        return [k?.trim(), decodeURIComponent((v || []).join("=") || "")];
      }),
    );
    const raw = cookies[COOKIE_NAME];
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        const userId = parsed?.user?.id;
        if (userId) {
          const internalBase =
            process.env.INTERNAL_API_URL ||
            `${process.env.HTTP_TLS_CERT || process.env.HTTP_TLS_KEY || process.env.NODE_ENV === "production" ? "https" : "http"}://${process.env.HTTP_HOST || "127.0.0.1"}:${process.env.HTTP_PORT || "3001"}`;
          const headers: Record<string, string> = {};
          if (process.env.INTERNAL_API_SECRET) {
            headers["x-internal-api-key"] = process.env.INTERNAL_API_SECRET;
          }
          void fetch(
            `${internalBase}/api/userSessions?userId=${encodeURIComponent(userId)}`,
            { method: "DELETE", headers },
          ).catch(() => null);
        }
      } catch (_) {
        /* ignore */
      }
    }
  } catch (_) {
    /* ignore */
  }

  const res = NextResponse.redirect(siteUrl);
  res.headers.set("Set-Cookie", cookie);
  return res;
}
