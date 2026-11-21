import { relayEvents } from "../../../lib/sse-relay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return relayEvents(req, "recent");
}
