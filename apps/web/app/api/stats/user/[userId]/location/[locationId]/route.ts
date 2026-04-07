import { requireSession, assertSelf } from "../../../../../../../lib/auth";
import { proxyRequest } from "../../../../../../../lib/proxy";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ userId: string; locationId: string }> },
) {
  try {
    const session = requireSession(req);
    const { userId, locationId } = await params;
    assertSelf(session, userId);
    return proxyRequest(
      `/api/stats/user/${encodeURIComponent(userId)}/location/${encodeURIComponent(locationId)}`,
    );
  } catch (res) {
    if (res instanceof Response) {
      return res;
    }
    throw res;
  }
}
