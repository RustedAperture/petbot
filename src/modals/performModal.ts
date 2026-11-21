import type {
  ActionContext,
  ResolvedAction,
} from "../utilities/customActions/resolver.js";
import {
  GuildMember,
  MessageFlags,
  type ModalSubmitInteraction,
  type User,
} from "discord.js";

export const customIdPrefix = "perform-modal:";

export async function handlePerformModal(modal: ModalSubmitInteraction) {
  const targetId = modal.customId.slice(customIdPrefix.length);
  if (!targetId) {
    await modal.reply({
      content: "Invalid target specified.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const { isOptedOut } = await import("../utilities/check_user.js");
  if (await isOptedOut(targetId)) {
    await modal.reply({
      content:
        "That user has opted out of PetBot and cannot be interacted with.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  let action: string | null = null;
  try {
    action = modal.fields.getStringSelectValues("action")[0];
  } catch {
    // not a text input modal
  }

  if (!action) {
    // attempt to read selection from raw modal data (label -> component pattern)
    const comp = (modal as any).data?.components?.[0]?.component;
    if (comp && Array.isArray(comp.values) && comp.values.length > 0) {
      action = comp.values[0];
    }
  }

  const guild = modal.guildId ?? modal.channelId!;
  // Normalize author to a User-like object (ensure .id exists)
  const authorRaw = modal.member ?? modal.user;
  const author =
    authorRaw && (authorRaw as any).user
      ? (authorRaw as any).user
      : (authorRaw as any);

  let resolved: ResolvedAction | null = null;
  let ctx: ActionContext | null = null;
  if (action && author?.id) {
    const { buildActionContextFor } = await import(
      "../commands/actionAutocomplete.js"
    );
    const { resolveAction } = await import(
      "../utilities/customActions/resolver.js"
    );
    ctx = await buildActionContextFor({
      guildId: modal.guildId,
      channelId: modal.channelId,
      authorId: author.id,
      targetId,
    });
    resolved = await resolveAction(action, ctx);
    if (!resolved) {
      await modal.reply({
        content: "That action isn't available here.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
  }

  await modal.deferReply();

  try {
    // fetch target (try member first) and normalize types
    let target: GuildMember | User;
    if (modal.guild) {
      try {
        target = (await modal.guild.members.fetch(targetId)) as GuildMember;
      } catch {
        // fallback to user
        target = (await modal.client.users.fetch(targetId)) as User;
      }
    } else {
      target = (await modal.client.users.fetch(targetId)) as User;
    }

    // defensive check: ensure ids exist
    if (!target || !(target as any).id) {
      await modal.editReply({ content: "Failed to resolve target." });
      return;
    }
    if (!author || !(author as any).id) {
      await modal.editReply({ content: "Failed to resolve actor." });
      return;
    }

    if (!action || !resolved || !ctx) {
      await modal.editReply({ content: "No action provided." });
      return;
    }

    const { checkUser } = await import("../utilities/check_user.js");
    const { performAction } = await import("../utilities/actionHelpers.js");

    // Ensure both target and author have action rows ready concurrently
    await Promise.all([
      checkUser(resolved.name, target, guild),
      checkUser(resolved.name, author, guild),
    ]);

    const container = await performAction(resolved, target, author, guild, {
      skipChecks: true,
      isRestricted: ctx.isRestricted,
    });

    await modal.editReply({
      components: [container] as any,
      flags: MessageFlags.IsComponentsV2,
    });
  } catch (err) {
    console.error(err);
    await modal.editReply({ content: "Failed to perform action." });
  }
}
