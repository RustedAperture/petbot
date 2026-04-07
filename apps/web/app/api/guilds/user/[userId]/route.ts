import { requireSession, assertSelf } from "../../../../../lib/auth";
import { proxyRequest } from "../../../../../lib/proxy";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const session = requireSession(req);
    const { userId } = await params;
    assertSelf(session, userId);
    return proxyRequest(`/api/guilds/user/${encodeURIComponent(userId)}`);
  } catch (res) {
    if (res instanceof Response) {
      return res;
    }
    throw res;
  }
}
