import { NextResponse } from "next/server";

const COOKIE_NAME = "petbot_session";

export async function GET() {
  const siteUrl = new URL("/", process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
  const secureAttr = siteUrl.protocol === "https:" ? "; Secure" : "";
  const cookie = `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secureAttr}`;
  const res = NextResponse.redirect(siteUrl);
  res.headers.set("Set-Cookie", cookie);
  return res;
}
