const { log } = require("./log");
const { botData, petData } = require("./db");
const logger = require("../logger");
const { MessageFlags } = require("discord.js");

exports.resetPet = async (interaction, userId, slot) => {
  let guildSettings, logChannel, pet_img;
  const inServer = interaction.guild;
  const target = interaction.user;

  const guild = interaction.guildId ?? interaction.channelId;

  if (interaction.context === 0 && inServer != null) {
    guildSettings = await botData.findOne({
      where: {
        guild_id: guild,
        default_pet_image: {
          [require("sequelize").Op.ne]: null,
        },
      },
    });

    logChannel = await interaction.guild.channels.fetch(
      guildSettings.get("log_channel"),
    );

    const baseImage = guildSettings.get("default_pet_image")
      ? guildSettings.get("default_pet_image")
      : "https://github.com/RustedAperture/Stickers/blob/main/Belly%20Rub%202.0/belly%20rub-base.png?raw=true";

    pet_img = slot === 1 ? baseImage : null;

    const logMsg = `> **User**: ${target.username} (<@${target.id}>)
		> **Slot**: ${slot}`;

    await log(
      "Reset Pet Image",
      logMsg,
      logChannel,
      target,
      pet_img,
      null,
      [255, 0, 0],
    );

    logger.debug(
      `Reset ${target.displayName} image ${slot} to the base image in ${interaction.guild.name}`,
    );
  } else {
    pet_img =
      slot === 1
        ? "https://github.com/RustedAperture/Stickers/blob/main/Belly%20Rub%202.0/belly%20rub-base.png?raw=true"
        : null;
    logger.debug(
      `reset ${interaction.user.displayName} image ${slot} to the base image in ${guild}`,
    );
  }

  try {
    logger.debug(
      `resetting ${userId} image ${slot} to the base image for ${guild}`,
    );
    const record = await petData.findOne({
      where: {
        user_id: userId,
        guild_id: guild,
      },
    });

    const imagesArray = JSON.parse(JSON.stringify(record.get("images") || []));
    if (slot > 1) {
      imagesArray.splice(slot - 1, 1);
    } else {
      imagesArray[slot - 1] = pet_img;
    }
    const cleanedImages = imagesArray.filter((img) => img && img.trim() !== "");
    await petData.update(
      { images: cleanedImages },
      {
        where: {
          id: record.get("id"),
        },
      },
    );
  } catch (error) {
    logger.error(
      { error: error },
      "Something went wrong with reseting the user image.",
    );
  }
  if (interaction.context !== 0 || inServer == null) {
    logger.debug("here");
    await interaction.reply({
      content: `Reset your image ${slot} to the base pet image`,
      flags: MessageFlags.Ephemeral,
    });
  }
};
