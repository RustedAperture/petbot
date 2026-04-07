import { NextResponse } from "next/server";
import {
  readCookie,
  getInternalApiBase,
  internalApiHeadersOptional,
} from "../../../../lib/internal-api";

export async function GET(req: Request) {
  const raw = readCookie(req);
  if (!raw) {
    return NextResponse.json({ session: null });
  }

  try {
    const session = JSON.parse(raw);

    // Augment session with server‑persisted guilds (if any)
    try {
      const userId = session?.user?.id;
      if (userId) {
        const res = await fetch(
          `${getInternalApiBase()}/api/userSessions/${encodeURIComponent(userId)}`,
          { headers: internalApiHeadersOptional() },
        );
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json.guilds)) {
            session.guilds = json.guilds;
          }
        }
      }
    } catch (err) {
      console.error("failed to fetch persisted user guilds:", err);
    }

    return NextResponse.json({ session });
  } catch (_err) {
    return NextResponse.json({ session: null });
  }
}
