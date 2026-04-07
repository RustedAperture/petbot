import { requireSession } from "../../../lib/auth";
import { proxyRequest } from "../../../lib/proxy";

export async function GET(req: Request) {
  try {
    const session = requireSession(req);
    const userId = session.user!.id!;
    return proxyRequest(`/api/guilds/user/${encodeURIComponent(userId)}`);
  } catch (res) {
    if (res instanceof Response) {
      return res;
    }
    throw res;
  }
}
