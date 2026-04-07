import { NextResponse } from "next/server";
import {
  readCookie,
  getInternalApiBase,
  internalApiHeadersOptional,
  SESSION_COOKIE_NAME,
} from "../../../../lib/internal-api";

export async function GET(req: Request) {
  const siteUrl = new URL(
    "/",
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  );
  const secureAttr = siteUrl.protocol === "https:" ? "; Secure" : "";
  const cookie = `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secureAttr}`;

  // Best-effort: clear persisted server-side session for this user
  try {
    const raw = readCookie(req);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        const userId = parsed?.user?.id;
        if (userId) {
          void fetch(
            `${getInternalApiBase()}/api/userSessions/${encodeURIComponent(userId)}`,
            { method: "DELETE", headers: internalApiHeadersOptional() },
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
