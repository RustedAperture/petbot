import { customActionsBase, relay } from "@/lib/custom-actions-relay";
import { requireSession } from "@/lib/auth";
import { apiError } from "@/lib/errors";
import { proxyRequest } from "@/lib/proxy";

const NAME = /^[a-z]{1,20}$/;

/** The phrase other actions with this name use, so a new one can match it. */
export function GET(
  req: Request,
  context: { params: Promise<{ name: string }> },
) {
  return relay(async () => {
    requireSession(req);
    const { name } = await context.params;
    if (!NAME.test(name)) {
      return apiError(400, "invalid_name");
    }
    return proxyRequest(`${customActionsBase}/phrase/${name}`);
  });
}
