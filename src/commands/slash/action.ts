import {
  SlashCommandBuilder,
  ApplicationIntegrationType,
  InteractionContextType,
  MessageFlags,
  type ChatInputCommandInteraction,
  type GuildMember,
  type User,
} from "discord.js";
import { performAction } from "../../utilities/actionHelpers.js";
import { resolveAction, type ActionContext, type ResolvedAction } from "../../utilities/customActions/resolver.js";
import { checkUser } from "../../utilities/check_user.js";
import { checkOptOuts } from "../../utilities/optOutHelper.js";
import { autocompleteActions, buildActionContext } from "../actionAutocomplete.js";

export const UNAVAILABLE_MESSAGE = "That action isn't available here.";

export async function replyUnavailable(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  await interaction.reply({
    content: UNAVAILABLE_MESSAGE,
    flags: MessageFlags.Ephemeral,
  });
}

/** Runs an already-resolved action against the `target` option; shared by `/action` and native guild commands. */
export async function executeResolvedAction(
  interaction: ChatInputCommandInteraction,
  action: ResolvedAction,
  ctx: ActionContext,
): Promise<void> {
  const rawTarget = interaction.options.getUser("target", true);
  const { optedOutIds, allOptedOut } = await checkOptOuts(interaction, [rawTarget]);
  if (allOptedOut) {
    return;
  }
  await interaction.deferReply();

  let target: GuildMember | User | null;
  let author: GuildMember | User;
  if (interaction.context === 0 && interaction.guild != null) {
    target = interaction.options.getMember("target") as GuildMember | null;
    author = interaction.member as GuildMember;
  } else {
    target = interaction.options.getUser("target");
    author = interaction.user;
  }
  const resolvedTarget = target ?? rawTarget;

  if (optedOutIds.has(rawTarget.id)) {
    await interaction.editReply({
      content: `<@${rawTarget.id}> has opted out of PetBot and cannot be interacted with.`,
    });
    return;
  }

  await checkUser(action.name, author, ctx.locationId);
  await resolvedTarget.fetch(true);
  const container = await performAction(
    action,
    resolvedTarget,
    author,
    ctx.locationId,
    { isRestricted: ctx.isRestricted },
  );
  await interaction.editReply({
    components: [container],
    flags: MessageFlags.IsComponentsV2,
  });
}

export const command = {
  data: new SlashCommandBuilder()
    .setName("action")
    .setDescription("Perform an action on another user")
    .addUserOption((option) =>
      option
        .setName("target")
        .setDescription("The user you want to act on")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("action")
        .setDescription("The action to perform")
        .setRequired(true)
        .setAutocomplete(true),
    )
    .setIntegrationTypes([
      ApplicationIntegrationType.GuildInstall,
      ApplicationIntegrationType.UserInstall,
    ])
    .setContexts([
      InteractionContextType.BotDM,
      InteractionContextType.Guild,
      InteractionContextType.PrivateChannel,
    ]),
  async execute(interaction: ChatInputCommandInteraction) {
    const ctx = await buildActionContext(interaction);
    const action = await resolveAction(interaction.options.getString("action", true), ctx);
    if (!action) {
      await replyUnavailable(interaction);
      return;
    }
    await executeResolvedAction(interaction, action, ctx);
  },
  autocomplete: autocompleteActions,
};

export default command;
