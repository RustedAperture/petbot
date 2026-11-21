import type {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
} from "discord.js";
import { getBotData } from "../db/functions.js";
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
  const guildId = interaction.guildId;
  const settings = guildId ? await getBotData(guildId) : null;
  const target = interaction.options.get("target")?.value;
  return {
    guildId,
    locationId: guildId ?? interaction.channelId!,
    authorId: interaction.user.id,
    targetId: typeof target === "string" ? target : null,
    isRestricted: Boolean(settings?.restricted),
  };
}

function labelFor(action: ResolvedAction, targetName: string | null): string {
  if (action.isBuiltIn) {
    return action.name;
  }
  if (action.sources.includes("guild")) {
    return `${action.name} · server`;
  }
  return `${action.name} · ${targetName ? `@${targetName}` : "personal"}`;
}

function targetDisplayName(interaction: AutocompleteInteraction): string | null {
  const option = interaction.options.get("target");
  return option?.user?.displayName ?? null;
}

export async function respondWithActions(
  interaction: AutocompleteInteraction,
  actions: ResolvedAction[] | string[],
): Promise<void> {
  const focused = interaction.options.getFocused().toLowerCase();
  const targetName = targetDisplayName(interaction);
  const choices = actions
    .map((a) =>
      typeof a === "string"
        ? { name: a, value: a }
        : { name: labelFor(a, targetName), value: a.name },
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
