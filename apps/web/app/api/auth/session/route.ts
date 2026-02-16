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
    return NextResponse.json({ session });
  } catch (err) {
    return NextResponse.json({ session: null });
  }
}
