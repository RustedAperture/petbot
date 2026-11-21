import {
  authorizeGuildMember,
  customActionsBase,
  relay,
} from "@/lib/custom-actions-relay";
import { proxyRequest } from "@/lib/proxy";

export function DELETE(
  req: Request,
  context: { params: Promise<{ guildId: string; name: string }> },
) {
  return relay(async () => {
    const { guildId, name } = await context.params;
    const actingUserId = await authorizeGuildMember(req, guildId);
    return proxyRequest(
      `${customActionsBase}/guild/${encodeURIComponent(guildId)}/user/${encodeURIComponent(actingUserId)}/${encodeURIComponent(name)}`,
      { method: "DELETE" },
    );
  });
}
