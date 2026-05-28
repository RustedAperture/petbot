import { requireSession } from "../../../lib/auth";
import { proxyRequest } from "../../../lib/proxy";
import { createHash } from "node:crypto";

function hashUserId(userId: string): string {
  return createHash("sha256").update(userId).digest("hex").slice(0, 6);
}

export async function GET(req: Request) {
  try {
    const session = requireSession(req);
    const userId = session.user!.id!;
    const hashed = hashUserId(userId);
    const res = await proxyRequest(
      `/api/leaderboardConsent/${encodeURIComponent(hashed)}`,
    );
    const json = (await res.json()) as { enabled: boolean; displayName: string | null };
    return Response.json({ ...json, hashLabel: `User #${hashed}` });
  } catch (res) {
    if (res instanceof Response) return res;
    throw res;
  }
}

export async function POST(req: Request) {
  try {
    const session = requireSession(req);
    const userId = session.user!.id!;
    const hashed = hashUserId(userId);
    const body = (await req.json()) as { displayName?: string };
    return proxyRequest(
      `/api/leaderboardConsent/${encodeURIComponent(hashed)}`,
      { method: "POST", body },
    );
  } catch (res) {
    if (res instanceof Response) return res;
    throw res;
  }
}

export async function DELETE(req: Request) {
  try {
    const session = requireSession(req);
    const userId = session.user!.id!;
    const hashed = hashUserId(userId);
    return proxyRequest(
      `/api/leaderboardConsent/${encodeURIComponent(hashed)}`,
      { method: "DELETE" },
    );
  } catch (res) {
    if (res instanceof Response) return res;
    throw res;
  }
}
