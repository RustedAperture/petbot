import {
  readCookie,
  getInternalApiBase,
  internalApiHeadersOptional,
} from "./internal-api";
import { apiError } from "./errors";

export type Session = {
  user?: { id?: string };
  guilds?: Array<{
    id: string;
    name?: string;
    owner?: boolean;
    permissions?: string | null;
  }>;
};

export function requireSession(req: Request): Session {
  const raw = readCookie(req);
  if (!raw) {
    throw apiError(401, "unauthorized");
  }
  try {
    const session = JSON.parse(raw) as Session;
    if (!session?.user?.id || !/^\d+$/.test(session.user.id)) {
      throw apiError(401, "unauthorized");
    }
    return session;
  } catch (e) {
    if (e instanceof Response) {
      throw e;
    }
    throw apiError(401, "unauthorized");
  }
}

export function assertSelf(session: Session, userId: string): void {
  if (session.user!.id !== userId) {
    throw apiError(403, "forbidden");
  }
}

export function assertGuildMembership(session: Session, guildId: string): void {
  if (!session.guilds?.some((g) => g.id === guildId)) {
    throw apiError(403, "forbidden");
  }
}

export async function resolveGuilds(
  session: Session,
): Promise<NonNullable<Session["guilds"]>> {
  if (Array.isArray(session.guilds)) {
    return session.guilds;
  }
  const userId = session.user!.id!;
  try {
    const res = await fetch(
      `${getInternalApiBase()}/api/userSessions/${encodeURIComponent(userId)}`,
      { headers: internalApiHeadersOptional() },
    );
    if (res.ok) {
      const json = (await res.json()) as { guilds?: Session["guilds"] };
      if (Array.isArray(json.guilds)) {
        return json.guilds;
      }
    }
  } catch {
    // ignore — authorization checks downstream will fail
  }
  return [];
}
