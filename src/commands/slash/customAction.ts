import {
  SlashCommandBuilder,
  ApplicationIntegrationType,
  InteractionContextType,
  MessageFlags,
  type AutocompleteInteraction,
  type ChatInputCommandInteraction,
} from "discord.js";
import { checkImage } from "../../utilities/check_image.js";
import { normalizeUrl } from "../../utilities/normalizeUrl.js";
import { canManageServerActions } from "../../utilities/helper.js";
import { validateCustomActionInput } from "../../utilities/customActions/validation.js";
import {
  listCustomActions,
  removeCustomAction,
  upsertCustomAction,
  type CustomActionScope,
} from "../../utilities/customActions/store.js";
import logger from "../../logger.js";
import { syncGuildCommands } from "../../utilities/customActions/guildCommandSync.js";
import { respondWithActions } from "../actionAutocomplete.js";

const NO_GUILD_MESSAGE = "Add PetBot to this server to create server actions.";
const NOT_ADMIN_MESSAGE = "You need Manage Server to manage server actions.";
const NAME_PATTERN = /^[a-z]{1,20}$/;

type Scope = { scope: CustomActionScope; ownerId: string };

function addScopeOption(
  option: import("discord.js").SlashCommandStringOption,
) {
  return option
    .setName("for")
    .setDescription("Whether the action is for you or for this server")
    .setRequired(true)
    .addChoices(
      { name: "me", value: "me" },
      { name: "server", value: "server" },
    );
}

async function resolveScope(
  interaction: ChatInputCommandInteraction,
  isAdminRequired: boolean,
): Promise<Scope | { error: string }> {
  if (interaction.options.getString("for", true) === "me") {
    return { scope: "user", ownerId: interaction.user.id };
  }
  const guildId = interaction.guildId;
  if (!guildId || !interaction.client.guilds.cache.has(guildId)) {
    return { error: NO_GUILD_MESSAGE };
  }
  if (
    isAdminRequired &&
    !(await canManageServerActions(interaction.client, guildId, interaction.user.id))
  ) {
    return { error: NOT_ADMIN_MESSAGE };
  }
  return { scope: "guild", ownerId: guildId };
}

async function handleAdd(interaction: ChatInputCommandInteraction) {
  const validated = validateCustomActionInput({
    name: interaction.options.getString("name", true),
    phrase: interaction.options.getString("phrase", true),
  });
  if ("error" in validated) {
    return validated.error;
  }
  const target = await resolveScope(interaction, true);
  if ("error" in target) {
    return target.error;
  }
  const image = normalizeUrl(interaction.options.getString("image", true));
  if (!(await checkImage(image))) {
    return "Your URL is invalid, please try again";
  }
  const result = await upsertCustomAction({
    ...target,
    name: validated.name,
    phrase: validated.phrase,
    image,
    createdBy: interaction.user.id,
  });
  if ("error" in result) {
    return result.error;
  }
  if (target.scope === "guild") {
    void syncGuildCommands(interaction.client, target.ownerId).catch((err) =>
      logger.error({ err, guildId: target.ownerId }, "Guild command sync failed"),
    );
  }
  return `Saved **${validated.name}** — "${validated.phrase}".`;
}

async function handleRemove(interaction: ChatInputCommandInteraction) {
  const target = await resolveScope(interaction, true);
  if ("error" in target) {
    return target.error;
  }
  const name = interaction.options.getString("name", true);
  if (!NAME_PATTERN.test(name)) {
    return "There's no such action to remove.";
  }
  const isRemoved = await removeCustomAction(target.scope, target.ownerId, name);
  if (!isRemoved) {
    return `There's no **${name}** to remove.`;
  }
  if (target.scope === "guild") {
    void syncGuildCommands(interaction.client, target.ownerId).catch((err) =>
      logger.error({ err, guildId: target.ownerId }, "Guild command sync failed"),
    );
  }
  return `Removed **${name}**.`;
}

async function handleList(interaction: ChatInputCommandInteraction) {
  const target = await resolveScope(interaction, false);
  if ("error" in target) {
    return target.error;
  }
  const actions = await listCustomActions(target.scope, target.ownerId);
  if (actions.length === 0) {
    return "No custom actions yet.";
  }
  return actions.map((a) => `${a.name} — ${a.phrase}`).join("\n");
}

const handlers = { add: handleAdd, remove: handleRemove, list: handleList };

export const command = {
  data: new SlashCommandBuilder()
    .setName("custom-action")
    .setDescription("Manage your custom actions")
    .addSubcommand((sub) =>
      sub
        .setName("add")
        .setDescription("Add or update a custom action")
        .addStringOption((o) =>
          o
            .setName("name")
            .setDescription("Lowercase letters only, up to 20")
            .setRequired(true),
        )
        .addStringOption((o) =>
          o
            .setName("phrase")
            .setDescription("What the action does, e.g. booped")
            .setRequired(true),
        )
        .addStringOption((o) =>
          o
            .setName("image")
            .setDescription("The url of the image to use")
            .setRequired(true),
        )
        .addStringOption(addScopeOption),
    )
    .addSubcommand((sub) =>
      sub
        .setName("remove")
        .setDescription("Remove a custom action")
        .addStringOption((o) =>
          o
            .setName("name")
            .setDescription("The action to remove")
            .setRequired(true)
            .setAutocomplete(true),
        )
        .addStringOption(addScopeOption),
    )
    .addSubcommand((sub) =>
      sub
        .setName("list")
        .setDescription("List custom actions")
        .addStringOption(addScopeOption),
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
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const handler =
      handlers[interaction.options.getSubcommand() as keyof typeof handlers];
    await interaction.editReply({ content: await handler(interaction) });
  },
  async autocomplete(interaction: AutocompleteInteraction) {
    const scope = interaction.options.getString("for");
    const guildId = interaction.guildId;
    const isServerUnavailable =
      scope === "server" &&
      (!guildId || !interaction.client.guilds.cache.has(guildId));
    const ownerId = scope === "server" ? guildId : interaction.user.id;
    if (!scope || !ownerId || isServerUnavailable) {
      await interaction.respond([]);
      return;
    }
    const actions = await listCustomActions(
      scope === "server" ? "guild" : "user",
      ownerId,
    );
    await respondWithActions(
      interaction,
      actions.map((a) => a.name),
    );
  },
};

export default command;
