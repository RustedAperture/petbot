import type {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
} from "discord.js";
import { ACTIONS } from "../types/constants.js";
import { buildActionContextFor } from "../utilities/customActions/context.js";
import { listCustomActions } from "../utilities/customActions/store.js";
import {
  resolveAvailableActions,
  type ActionContext,
  type ResolvedAction,
} from "../utilities/customActions/resolver.js";

const MAX_CHOICES = 25;

type ActionInteraction = ChatInputCommandInteraction | AutocompleteInteraction;

/** Builds the resolver context; works for chat-input and autocomplete, where the target may be unset. */
export async function buildActionContext(
  interaction: ActionInteraction,
): Promise<ActionContext> {
  const target = interaction.options.get("target")?.value;
  return buildActionContextFor({
    guildId: interaction.guildId,
    channelId: interaction.channelId,
    authorId: interaction.user.id,
    targetId: typeof target === "string" ? target : null,
  });
}

/** Names offered by commands that only know built-ins and the current server's actions. */
export async function listBuiltInAndGuildNames(
  guildId: string | null,
): Promise<string[]> {
  const guildNames = guildId
    ? (await listCustomActions("guild", guildId)).map((a) => a.name)
    : [];
  return [...Object.keys(ACTIONS), ...guildNames];
}

function labelFor(
  action: ResolvedAction,
  authorId: string,
  targetId: string | null,
  targetName: string | null,
): string {
  if (action.isBuiltIn) {
    return action.name;
  }
  if (action.sources.includes("guild")) {
    return `${action.name} · server`;
  }
  if (action.personalOwnerIds.includes(authorId)) {
    return `${action.name} · yours`;
  }
  const isTargetOwned = targetId !== null && action.personalOwnerIds.includes(targetId);
  return `${action.name} · ${isTargetOwned && targetName ? `@${targetName}` : "personal"}`;
}

export async function respondWithActions(
  interaction: AutocompleteInteraction,
  actions: ResolvedAction[] | string[],
): Promise<void> {
  const focused = interaction.options.getFocused().toLowerCase();
  const authorId = interaction.user.id;
  const rawTarget = interaction.options.get("target")?.value;
  const targetId = typeof rawTarget === "string" ? rawTarget : null;
  // Autocomplete options are raw IDs, so the name only comes from the client cache.
  const cachedTarget = targetId ? interaction.client.users.cache.get(targetId) : undefined;
  const targetName = cachedTarget?.displayName ?? cachedTarget?.username ?? null;
  const choices = actions
    .map((a) =>
      typeof a === "string"
        ? { name: a, value: a }
        : { name: labelFor(a, authorId, targetId, targetName), value: a.name },
    )
    .filter((c) => c.value.toLowerCase().startsWith(focused))
    .slice(0, MAX_CHOICES);
  await interaction.respond(choices);
}

export async function autocompleteActions(
  interaction: AutocompleteInteraction,
): Promise<void> {
  const ctx = await buildActionContext(interaction);
  await respondWithActions(interaction, await resolveAvailableActions(ctx));
}
