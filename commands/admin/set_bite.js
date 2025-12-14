const {
  SlashCommandBuilder,
  PermissionsBitField,
  MessageFlags,
} = require("discord.js");
const { checkUserBite } = require("../../utilities/check_user");
const { checkImage } = require("../../utilities/check_image");
const { botData } = require("./../../utilities/db");
const { normalizeUrl } = require("../../utilities/normalizeUrl");
const { updateBite } = require("../../utilities/update-bite");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("set-bite")
    .setDescription("Sets a bite for a specific user")
    .addUserOption((option) =>
      option
        .setName("target")
        .setDescription("The user you want to change")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("url")
        .setDescription("The url of the image")
        .setRequired(true),
    )
    .addNumberOption((option) =>
      option
        .setName("slot")
        .setDescription(
          "1-4 These are your slots, if left undefined then it will default to 1",
        )
        .setRequired(true)
        .addChoices(
          { name: "1", value: 1 },
          { name: "2", value: 2 },
          { name: "3", value: 3 },
          { name: "4", value: 4 },
        ),
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("The reason for changing the image")
        .setRequired(false),
    )
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers),
  async execute(interaction) {
    const target = interaction.options.getMember("target");

    let reason = interaction.options.getString("reason");
    const uncleanUrl = interaction.options.getString("url");
    let url = normalizeUrl(uncleanUrl);
    const slot = interaction.options.getNumber("slot");

    const guild = interaction.guildId;

    const guildSettings = await botData.findOne({
      where: {
        guild_id: guild,
      },
    });

    if (!reason) {
      reason = "None";
    }

    if (url === "default") {
      url = guildSettings.get("default_bite_image");
    }

    await checkUserBite(target, guild);

    if (await checkImage(url)) {
      await updateBite(interaction, target.id, url, false, reason, slot);
    } else {
      await interaction.reply({
        content: "Invalid url please try again.",
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
