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

  await modal.deferReply();
  let action: string | null = null;
  try {
    action = modal.fields.getStringSelectValues("action")[0];
  } catch {
    // not a text input modal
  }

  const guild = modal.guildId ?? modal.channelId!;
  // Normalize author to a User-like object (ensure .id exists)
  const authorRaw = modal.member ?? modal.user;
  const author =
    authorRaw && (authorRaw as any).user
      ? (authorRaw as any).user
      : (authorRaw as any);

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

    if (!action) {
      // attempt to read selection from raw modal data (label -> component pattern)
      const comp = (modal as any).data?.components?.[0]?.component;
      if (comp && Array.isArray(comp.values) && comp.values.length > 0) {
        action = comp.values[0];
      }
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

    if (!action) {
      await modal.editReply({ content: "No action provided." });
      return;
    }

    // validate action
    const { ACTIONS } = await import("../types/constants.js");
    if (!(action in ACTIONS)) {
      await modal.editReply({ content: "Invalid action." });
      return;
    }

    const { checkUser } = await import("../utilities/check_user.js");
    const { performAction } = await import("../utilities/actionHelpers.js");

    // Ensure both target and author have action rows ready concurrently
    await Promise.all([
      checkUser(action as any, target, guild),
      checkUser(action as any, author, guild),
    ]);

    const container = await performAction(
      action as any,
      target,
      author,
      guild,
      { skipChecks: true },
    );

    await modal.editReply({
      components: [container] as any,
      flags: MessageFlags.IsComponentsV2,
    });
  } catch (err) {
    console.error(err);
    await modal.editReply({ content: "Failed to perform action." });
  }
}
