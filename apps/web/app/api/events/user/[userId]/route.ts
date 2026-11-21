import { relayEvents } from "../../../../../lib/sse-relay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params;
  return relayEvents(req, "recent", { userId });
}
