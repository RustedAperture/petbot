import {
  authorizeGuildMember,
  relay,
} from "@/lib/custom-actions-relay";
import { proxyRequest } from "@/lib/proxy";

type Context = { params: Promise<{ guildId: string }> };

/** Whether PetBot is in a guild the session user belongs to. */
export function GET(req: Request, context: Context) {
  return relay(async () => {
    const { guildId } = await context.params;
    await authorizeGuildMember(req, guildId);
    return proxyRequest(`/api/guilds/bot/${encodeURIComponent(guildId)}`);
  });
}
