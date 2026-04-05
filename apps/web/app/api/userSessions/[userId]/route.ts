import { requireSession, assertSelf } from "../../../../lib/auth";
import { proxyRequest } from "../../../../lib/proxy";

/**
 * GET /api/userSessions/:userId — proxy to internal API.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const session = requireSession(req);
    const { userId } = await params;
    assertSelf(session, userId);
    return await proxyRequest(
      `/api/userSessions/${encodeURIComponent(userId)}`,
    );
  } catch (err) {
    if (err instanceof Response) {
      return err;
    }
    throw err;
  }
}

/**
 * DELETE /api/userSessions/:userId — proxy to internal API.
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const session = requireSession(req);
    const { userId } = await params;
    assertSelf(session, userId);
    return await proxyRequest(
      `/api/userSessions/${encodeURIComponent(userId)}`,
      {
        method: "DELETE",
      },
    );
  } catch (err) {
    if (err instanceof Response) {
      return err;
    }
    throw err;
  }
}
