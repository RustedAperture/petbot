import crypto from "node:crypto";
import { NextResponse } from "next/server";

// short-lived state cookie name
const STATE_COOKIE = "petbot_oauth_state";

function makeStateCookie(value: string) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  // short lifetime (10 minutes)
  return `${STATE_COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 10}${secure}`;
}

export async function GET() {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  if (!clientId) {
    return NextResponse.json(
      { error: "missing_discord_client_id" },
      { status: 500 },
    );
  }

  // generate cryptographically-random state and store in a short-lived HttpOnly cookie
  const state = crypto.randomBytes(24).toString("hex");

  const redirectUri = encodeURIComponent(
    `${siteUrl}/api/auth/discord/callback`,
  );
  const scopes = encodeURIComponent("identify guilds");
  const url = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scopes}&prompt=consent&state=${state}`;

  const redirect = NextResponse.redirect(url);
  redirect.headers.set("Set-Cookie", makeStateCookie(state));
  return redirect;
}
