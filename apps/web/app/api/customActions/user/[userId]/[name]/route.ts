import {
  authorizeSelf,
  customActionsBase,
  relay,
} from "@/lib/custom-actions-relay";
import { proxyRequest } from "@/lib/proxy";

export function DELETE(
  req: Request,
  context: { params: Promise<{ userId: string; name: string }> },
) {
  return relay(async () => {
    const params = await context.params;
    const userId = authorizeSelf(req, params.userId);
    return proxyRequest(
      `${customActionsBase}/user/${encodeURIComponent(userId)}/${encodeURIComponent(params.name)}`,
      { method: "DELETE" },
    );
  });
}
