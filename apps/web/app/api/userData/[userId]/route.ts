import { requireSession, assertSelf } from "../../../../lib/auth";
import { proxyRequest } from "../../../../lib/proxy";

/**
 * DELETE /api/userData/:userId — proxy to internal API.
 * Only allows the session user to delete their own data.
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const session = requireSession(req);
    const { userId } = await params;
    assertSelf(session, userId);
    return proxyRequest(`/api/userData/${encodeURIComponent(userId)}`, {
      method: "DELETE",
    });
  } catch (res) {
    if (res instanceof Response) {
      return res;
    }
    throw res;
  }
}
