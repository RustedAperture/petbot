import { authorizeOwner, relay } from "@/lib/custom-actions-relay";
import { proxyRequest } from "@/lib/proxy";

export function GET(req: Request) {
  return relay(async () => {
    authorizeOwner(req);
    return proxyRequest("/api/owner/bans");
  });
}
