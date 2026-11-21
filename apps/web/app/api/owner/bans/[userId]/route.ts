import { authorizeOwner, relay } from "@/lib/custom-actions-relay";
import { apiError } from "@/lib/errors";
import { proxyRequest } from "@/lib/proxy";

type Context = { params: Promise<{ userId: string }> };

const DISCORD_ID = /^\d{17,20}$/;

export function PUT(req: Request, context: Context) {
  return relay(async () => {
    authorizeOwner(req);
    const { userId } = await context.params;
    if (!DISCORD_ID.test(userId)) {
      return apiError(400, "invalid_user_id");
    }
    const body = await req.json().catch(() => null);
    return proxyRequest(`/api/owner/bans/${encodeURIComponent(userId)}`, {
      method: "PUT",
      body: { reason: body?.reason ?? null },
    });
  });
}

export function DELETE(req: Request, context: Context) {
  return relay(async () => {
    authorizeOwner(req);
    const { userId } = await context.params;
    return proxyRequest(`/api/owner/bans/${encodeURIComponent(userId)}`, {
      method: "DELETE",
    });
  });
}
