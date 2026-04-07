import {
  requireSession,
  assertSelf,
  resolveGuilds,
} from "../../../../../../lib/auth";
import { proxyRequest } from "../../../../../../lib/proxy";
import { apiError } from "../../../../../../lib/errors";
import { isAdminOrOwnerGuild } from "../../../../../../lib/utils";

async function authorize(
  req: Request,
  context: { params: Promise<{ guildId: string; userId: string }> },
) {
  const session = requireSession(req);
  const params = (await context?.params) || {};
  const guildId = params.guildId as string | undefined;
  const userId = params.userId as string | undefined;

  if (!guildId || !userId) {
    throw apiError(400, "missing parameter: guildId or userId");
  }

  assertSelf(session, userId);

  const guilds = await resolveGuilds(session);
  const guild = guilds.find((g) => g.id === guildId);
  if (!guild) {
    throw apiError(403, "forbidden");
  }

  if (!isAdminOrOwnerGuild(guild)) {
    throw apiError(403, "forbidden");
  }

  return { guildId, userId };
}

export async function GET(
  req: Request,
  context: { params: Promise<{ guildId: string; userId: string }> },
) {
  try {
    const { guildId, userId } = await authorize(req, context);
    return proxyRequest(
      `/api/serverSettings/${encodeURIComponent(guildId)}/userId/${encodeURIComponent(userId)}`,
      { forwardContentType: true },
    );
  } catch (res) {
    if (res instanceof Response) {
      return res;
    }
    throw res;
  }
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ guildId: string; userId: string }> },
) {
  try {
    const { guildId, userId } = await authorize(req, context);

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return apiError(400, "invalid_payload");
    }

    return proxyRequest(
      `/api/serverSettings/${encodeURIComponent(guildId)}/userId/${encodeURIComponent(userId)}`,
      {
        method: "PATCH",
        body,
        forwardContentType: true,
      },
    );
  } catch (res) {
    if (res instanceof Response) {
      return res;
    }
    throw res;
  }
}
