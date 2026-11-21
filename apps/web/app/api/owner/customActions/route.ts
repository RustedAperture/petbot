import { authorizeOwner, relay } from "@/lib/custom-actions-relay";
import { proxyRequest } from "@/lib/proxy";

const FILTERS = ["name", "scope", "ownerId"];

export function GET(req: Request) {
  return relay(async () => {
    authorizeOwner(req);
    const incoming = new URL(req.url).searchParams;
    const query = new URLSearchParams();
    for (const key of FILTERS) {
      for (const value of incoming.getAll(key)) {
        query.append(key, value);
      }
    }
    const suffix = query.size > 0 ? `?${query}` : "";
    return proxyRequest(`/api/owner/customActions${suffix}`);
  });
}
