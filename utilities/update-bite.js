const { ButtonStyle, ButtonBuilder, MessageFlags } = require("discord.js");
const { botData, biteData } = require("./db");
const { log } = require("./log");
const logger = require("../logger");

exports.updateBite = async (
  interaction,
  userId,
  url,
  everywhere = false,
  reason = null,
  slot,
) => {
  let guildSettings, logChannel, row;
  const inServer = interaction.guild;
  let loggermsg;
  const biteIndex = slot - 1;
  const target = interaction.user;

  const guild = interaction.guildId ?? interaction.channelId;

  if (interaction.context === 0 && inServer != null) {
    guildSettings = await botData.findOne({
      where: {
        guild_id: guild,
      },
    });
    logChannel = await interaction.guild.channels.fetch(
      guildSettings.get("log_channel"),
    );
  }

  const cmd = interaction.commandName;

  try {
    if (everywhere) {
      const records = await biteData.findAll({
        where: {
          user_id: userId,
        },
      });

      for (const record of records) {
        const imagesArray = JSON.parse(
          JSON.stringify(record.get("images") || []),
        );

        imagesArray[biteIndex] = url;

        await biteData.update(
          { images: imagesArray },
          {
            where: {
              id: record.get("id"),
            },
          },
        );
      }
    } else {
      const record = await biteData.findOne({
        where: {
          user_id: userId,
          guild_id: guild,
        },
      });

      const imagesArray = JSON.parse(
        JSON.stringify(record.get("images") || []),
      );

      imagesArray[biteIndex] = url;

      await biteData.update(
        { images: imagesArray },
        {
          where: {
            id: record.get("id"),
          },
        },
      );
    }
  } catch (error) {
    logger.error(
      { error: error },
      "Something went wrong with updating the user image.",
    );
  }

  if (interaction.context === 0 && inServer != null) {
    if (cmd === "change-bite") {
      await interaction.reply({
        content: "Updated your image to the new url",
        flags: MessageFlags.Ephemeral,
      });

      row = new ButtonBuilder()
        .setCustomId("reset-bite")
        .setLabel("Reset Bite")
        .setStyle(ButtonStyle.Danger);
      reason = undefined;
    } else {
      await interaction.reply({
        content: `Updated ${target.username} image to the new url`,
        flags: MessageFlags.Ephemeral,
      });
      row = undefined;
    }

    const logMsg = `> **User**: ${target.username} (<@${target.id}>)
		> **Slot**: ${slot}
		> **Reason**: ${reason}`;

    await log(
      "Updated Bite Image",
      logMsg,
      logChannel,
      interaction.user,
      url,
      row,
      [255, 165, 0],
    );
    loggermsg = `Updated ${target.username} image ${slot} to the new url in ${interaction.guild.name}`;
  } else {
    await interaction.reply({
      content: "Updated your image to the new url",
      flags: MessageFlags.Ephemeral,
    });
    loggermsg = `Updated ${target.username} image ${slot} to the new url in ${guild}`;
  }
  if (everywhere) {
    loggermsg = `Updated ${target.username} image ${slot} to the new url everywhere`;
  }
  logger.debug(loggermsg);
};
