import { authorizeOwner, relay } from "@/lib/custom-actions-relay";
import { proxyRequest } from "@/lib/proxy";

type Context = { params: Promise<{ id: string }> };

export function PATCH(req: Request, context: Context) {
  return relay(async () => {
    authorizeOwner(req);
    const { id } = await context.params;
    const body = await req.json().catch(() => null);
    return proxyRequest(`/api/owner/customActions/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: { phrase: body?.phrase, image: body?.image },
    });
  });
}

export function DELETE(req: Request, context: Context) {
  return relay(async () => {
    authorizeOwner(req);
    const { id } = await context.params;
    return proxyRequest(`/api/owner/customActions/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  });
}
