const { log } = require("./log");
const { botData, biteData } = require("./db");
const logger = require("../logger");

exports.resetBite = async (interaction, userId, slot) => {
  let guildSettings, logChannel, bite_img;
  const inServer = interaction.guild;
  const target = interaction.user;

  const guild = interaction.guildId ?? interaction.channelId;

  if (interaction.context === 0 && inServer != null) {
    guildSettings = await botData.findOne({
      where: {
        guild_id: guild,
        default_bite_image: {
          [require("sequelize").Op.ne]: null,
        },
      },
    });

    logChannel = await interaction.guild.channels.fetch(
      guildSettings.get("log_channel"),
    );

    const baseImage = guildSettings.get("default_pet_image")
      ? guildSettings.get("default_pet_image")
      : "https://cloud.wfox.app/s/E9sXZLSAGw28M3K/preview";

    bite_img = slot === 1 ? baseImage : null;

    const logMsg = `> **User**: ${target.username} (<@${target.id}>)
		> **Slot**: ${slot}`;

    await log(
      "Reset Bite Image",
      logMsg,
      logChannel,
      target,
      bite_img,
      null,
      [255, 0, 0],
    );

    logger.debug(
      `Reset ${target.displayName} image ${slot} to the base image in ${interaction.guild.name}`,
    );
  } else {
    bite_img =
      slot === 1 ? "https://cloud.wfox.app/s/E9sXZLSAGw28M3K/preview" : null;
    logger.debug(
      `reset ${interaction.user.displayName} image ${slot} to the base image in ${guild}`,
    );
  }

  try {
    const record = await biteData.findOne({
      where: {
        user_id: userId,
        guild_id: guild,
      },
    });

    const imagesArray = JSON.parse(JSON.stringify(record.get("images") || []));
    if (slot > 1) {
      imagesArray.splice(slot - 1, 1);
    } else {
      imagesArray[slot - 1] = bite_img;
    }
    const cleanedImages = imagesArray.filter((img) => img && img.trim() !== "");
    await biteData.update(
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
};
