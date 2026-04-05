import { requireSession } from "../../../lib/auth";
import { proxyRequest } from "../../../lib/proxy";
import { apiError } from "../../../lib/errors";

export async function GET(req: Request) {
  try {
    const session = requireSession(req);
    const url = new URL(req.url);
    const guildId = url.searchParams.get("guildId");

    if (!guildId) {
      return apiError(400, "missing parameter: guildId");
    }

    // Always use session user ID — never allow client to supply userId
    const targetUserId = session.user!.id!;

    return proxyRequest(
      `/api/guildChannels/${encodeURIComponent(guildId)}/user/${encodeURIComponent(targetUserId)}`,
      {
        stripInternalDetails: process.env.NODE_ENV === "production",
      },
    );
  } catch (res) {
    if (res instanceof Response) {
      return res;
    }
    throw res;
  }
}
