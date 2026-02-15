import { NextResponse } from "next/server";

export async function GET() {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  if (!clientId) {
    return NextResponse.json(
      { error: "missing_discord_client_id" },
      { status: 500 },
    );
  }

  const redirectUri = encodeURIComponent(
    `${siteUrl}/api/auth/discord/callback`,
  );
  const scopes = encodeURIComponent("identify guilds");
  const url = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scopes}&prompt=consent`;

  return NextResponse.redirect(url);
}
