import {
  SlashCommandBuilder,
  PermissionsBitField,
  MessageFlags,
} from "discord.js";
import { checkUser } from "../../utilities/check_user.js";
import { checkImage } from "../../utilities/check_image.js";
import { BotData } from "../../utilities/db.js";
import { normalizeUrl } from "../../utilities/normalizeUrl.js";
import { updateAction } from "../../utilities/updateAction.js";
import { emitCommand } from "../../utilities/metrics.js";

export const command = {
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
  async execute(interaction: any) {
    emitCommand("set-bite");
    const target = interaction.options.getMember("target");

    let reason = interaction.options.getString("reason");
    const uncleanUrl = interaction.options.getString("url");
    let url = normalizeUrl(uncleanUrl);
    const slot = interaction.options.getNumber("slot");

    const guild = interaction.guildId;

    const guildSettings = await BotData.findOne({
      where: {
        guild_id: guild,
      },
    });

    if (!reason) {
      reason = "None";
    }

    if (url === "default") {
      url = guildSettings!.get("default_bite_image") as string;
    }

    await checkUser("bite", target, guild);

    if (await checkImage(url)) {
      await updateAction(
        "bite",
        interaction,
        target.id,
        url,
        false,
        reason,
        slot,
      );
    } else {
      await interaction.reply({
        content: "Invalid url please try again.",
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};

export default command;
