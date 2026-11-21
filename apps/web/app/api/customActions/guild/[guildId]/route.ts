import {
  authorizeGuildMember,
  customActionsBase,
  readActionBody,
  relay,
} from "@/lib/custom-actions-relay";
import { proxyRequest } from "@/lib/proxy";

type Context = { params: Promise<{ guildId: string }> };

export function GET(req: Request, context: Context) {
  return relay(async () => {
    const { guildId } = await context.params;
    await authorizeGuildMember(req, guildId);
    return proxyRequest(
      `${customActionsBase}/guild/${encodeURIComponent(guildId)}`,
    );
  });
}

export function PUT(req: Request, context: Context) {
  return relay(async () => {
    const { guildId } = await context.params;
    const actingUserId = await authorizeGuildMember(req, guildId);
    const body = await readActionBody(req);
    return proxyRequest(
      `${customActionsBase}/guild/${encodeURIComponent(guildId)}/user/${encodeURIComponent(actingUserId)}`,
      { method: "PUT", body },
    );
  });
}
