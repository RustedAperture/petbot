import { relayEvents } from "../../../../../../../lib/sse-relay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ userId: string; locationId: string }> },
) {
  const { userId, locationId } = await params;
  return relayEvents(req, "recent", { userId, locationId });
}
