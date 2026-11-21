import { assertSelf, requireSession, resolveGuilds } from "./auth";
import { apiError } from "./errors";

export const customActionsBase = "/api/customActions";

export async function readActionBody(req: Request): Promise<object> {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw apiError(400, "invalid_payload", { reason: "body_must_be_object" });
  }
  return body;
}

/** Session user must be `userId`. */
export function authorizeSelf(req: Request, userId: string): string {
  assertSelf(requireSession(req), userId);
  return userId;
}

/**
 * Session user must share `guildId`; the bot performs the permission check.
 * Returns the session user, which is the only acting user ever forwarded.
 */
export async function authorizeGuildMember(
  req: Request,
  guildId: string,
): Promise<string> {
  const session = requireSession(req);
  const guilds = await resolveGuilds(session);
  if (!guilds.some((g) => g.id === guildId)) {
    throw apiError(403, "forbidden");
  }
  return session.user!.id!;
}

/** Runs a relay handler, turning thrown Responses into the response. */
export async function relay(run: () => Promise<Response>): Promise<Response> {
  try {
    return await run();
  } catch (res) {
    if (res instanceof Response) {
      return res;
    }
    throw res;
  }
}
