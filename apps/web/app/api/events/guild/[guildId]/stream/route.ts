import { relayEvents } from "../../../../../../lib/sse-relay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ guildId: string }> },
) {
  const { guildId } = await params;
  return relayEvents(req, "stream", { guildId });
}
