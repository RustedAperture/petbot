import { requireSession } from "../../../../../../lib/auth";
import { proxyRequest } from "../../../../../../lib/proxy";
import { apiError } from "../../../../../../lib/errors";

export async function GET(req: Request, context: any) {
  try {
    const session = requireSession(req);
    const params = (await context?.params) || {};
    const guildId = params.guildId as string | undefined;

    if (!guildId) {
      return apiError(400, "missing parameter: guildId");
    }

    // Always use session user ID — ignore URL-supplied userId for security
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
