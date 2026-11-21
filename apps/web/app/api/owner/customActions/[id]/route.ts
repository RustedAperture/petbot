import { authorizeOwner, relay } from "@/lib/custom-actions-relay";
import { proxyRequest } from "@/lib/proxy";

export function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  return relay(async () => {
    authorizeOwner(req);
    const { id } = await context.params;
    return proxyRequest(`/api/owner/customActions/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  });
}
