import { NextResponse } from "next/server";

const COOKIE_NAME = "petbot_session";

export async function GET() {
  const cookie = `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
  const res = NextResponse.redirect(
    new URL("/", process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  );
  res.headers.set("Set-Cookie", cookie);
  return res;
}
