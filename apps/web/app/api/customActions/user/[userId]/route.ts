import {
  authorizeSelf,
  customActionsBase,
  readActionBody,
  relay,
} from "@/lib/custom-actions-relay";
import { proxyRequest } from "@/lib/proxy";

type Context = { params: Promise<{ userId: string }> };

export function GET(req: Request, context: Context) {
  return relay(async () => {
    const userId = authorizeSelf(req, (await context.params).userId);
    return proxyRequest(
      `${customActionsBase}/user/${encodeURIComponent(userId)}`,
    );
  });
}

export function PUT(req: Request, context: Context) {
  return relay(async () => {
    const userId = authorizeSelf(req, (await context.params).userId);
    const body = await readActionBody(req);
    return proxyRequest(
      `${customActionsBase}/user/${encodeURIComponent(userId)}`,
      { method: "PUT", body },
    );
  });
}
