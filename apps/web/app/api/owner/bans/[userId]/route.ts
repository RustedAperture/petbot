import { authorizeOwner, relay } from "@/lib/custom-actions-relay";
import { proxyRequest } from "@/lib/proxy";

type Context = { params: Promise<{ userId: string }> };

function forward(method: "PUT" | "DELETE") {
  return (req: Request, context: Context) =>
    relay(async () => {
      authorizeOwner(req);
      const { userId } = await context.params;
      return proxyRequest(`/api/owner/bans/${encodeURIComponent(userId)}`, {
        method,
      });
    });
}

export const PUT = forward("PUT");
export const DELETE = forward("DELETE");
