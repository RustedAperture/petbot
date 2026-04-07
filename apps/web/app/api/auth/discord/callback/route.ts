import { NextResponse } from "next/server";
import {
  getInternalApiBase,
  internalApiHeadersOptional,
  SESSION_COOKIE_NAME,
} from "../../../../../lib/internal-api";
import crypto from "node:crypto";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function makeCookieValue(obj: unknown) {
  return encodeURIComponent(JSON.stringify(obj));
}

function makeCookieHeader(value: string) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE_NAME}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${COOKIE_MAX_AGE}${secure}`;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  // Validate state cookie matches state param to protect against CSRF / session-fixation
  const cookieHeader = req.headers.get("cookie") || "";
  const cookies = Object.fromEntries(
    cookieHeader.split(";").map((c) => {
      const [k, ...v] = c.split("=");
      return [k?.trim(), decodeURIComponent((v || []).join("=") || "")];
    }),
  );
  const savedState = cookies["petbot_oauth_state"] as string | undefined;

  // clear state cookie helper
  const clearStateCookie = () =>
    `${"petbot_oauth_state"}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;

  if (!code) {
    return NextResponse.redirect(new URL("/", siteUrl));
  }

  if (!stateParam || !savedState) {
    const res = NextResponse.json(
      { error: "invalid_oauth_state" },
      { status: 400 },
    );
    res.headers.set("Set-Cookie", clearStateCookie());
    return res;
  }

  try {
    const a = Buffer.from(
      crypto.createHash("sha256").update(stateParam).digest(),
    );
    const b = Buffer.from(
      crypto.createHash("sha256").update(savedState).digest(),
    );
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      const res = NextResponse.json(
        { error: "invalid_oauth_state" },
        { status: 400 },
      );
      res.headers.set("Set-Cookie", clearStateCookie());
      return res;
    }
  } catch (err) {
    console.error("Error validating OAuth state:", err);
    const res = NextResponse.json(
      { error: "invalid_oauth_state" },
      { status: 400 },
    );
    res.headers.set("Set-Cookie", clearStateCookie());
    return res;
  }

  // clear the one-time state cookie now that it's been validated
  const stateClearingHeader = clearStateCookie();

  if (!process.env.DISCORD_CLIENT_ID || !process.env.DISCORD_CLIENT_SECRET) {
    return NextResponse.json(
      { error: "discord_oauth_not_configured" },
      { status: 500 },
    );
  }

  // Exchange code for token
  const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID!,
      client_secret: process.env.DISCORD_CLIENT_SECRET!,
      grant_type: "authorization_code",
      code,
      redirect_uri: `${siteUrl}/api/auth/discord/callback`,
    }),
  });

  if (!tokenRes.ok) {
    const bodyText = await tokenRes.text();
    console.error("Discord token exchange failed:", tokenRes.status, bodyText);
    let details: unknown = bodyText;
    try {
      details = JSON.parse(bodyText);
    } catch (_) {
      /* leave as text */
    }

    return NextResponse.json(
      { error: "token_exchange_failed", status: tokenRes.status, details },
      { status: 500 },
    );
  }

  const tokenJson = await tokenRes.json();
  const accessToken = tokenJson.access_token as string | undefined;
  if (!accessToken) {
    return NextResponse.json({ error: "no_access_token" }, { status: 500 });
  }

  // Fetch user + guilds (guilds requires `guilds` scope)
  const [userRes, guildsRes] = await Promise.all([
    fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
    fetch("https://discord.com/api/users/@me/guilds", {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
  ]);

  if (!userRes.ok) {
    return NextResponse.json({ error: "failed_fetch_user" }, { status: 500 });
  }
  const userJson = await userRes.json();

  let guildsJson: unknown[] = [];
  if (guildsRes.ok) {
    guildsJson = (await guildsRes.json()) || [];
  }

  const avatarUrl = userJson.avatar
    ? `https://cdn.discordapp.com/avatars/${userJson.id}/${userJson.avatar}${String(userJson.avatar).startsWith("a_") ? ".gif" : ".png"}?size=128`
    : `https://cdn.discordapp.com/embed/avatars/${Number(userJson.discriminator) % 5}.png`;

  // Persist full guild list server-side and keep cookie small (user object only)
  const session = {
    user: {
      id: userJson.id,
      username: `${userJson.username}#${userJson.discriminator}`,
      avatar: userJson.avatar ?? null,
      avatarUrl,
    },
  };

  // Persist the user's guild list to the internal API (server-side storage)
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...internalApiHeadersOptional(),
    };
    // send full guilds list to internal API (upsert) — await so session is available immediately after redirect
    try {
      const persistRes = await fetch(
        `${getInternalApiBase()}/api/userSessions/${encodeURIComponent(userJson.id)}`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ guilds: guildsJson || [] }),
        },
      );
      if (!persistRes.ok) {
        console.warn(
          "failed to persist user guilds to internal API",
          await persistRes.text(),
        );
      }
    } catch (err) {
      console.warn("failed to persist user guilds to internal API", err);
    }
  } catch (err) {
    console.warn("error while persisting user guilds", err);
  }

  const cookieVal = makeCookieValue(session);
  const sessionCookieHeader = makeCookieHeader(cookieVal);

  const redirect = NextResponse.redirect(new URL("/", siteUrl));
  // set session cookie and clear the one-time oauth state cookie
  redirect.headers.set("Set-Cookie", sessionCookieHeader);
  redirect.headers.append("Set-Cookie", stateClearingHeader);
  return redirect;
}
