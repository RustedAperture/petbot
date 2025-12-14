import { ButtonStyle, ButtonBuilder, MessageFlags } from "discord.js";
import { BotData, PetData } from "./db.js";
import { log } from "./log.js";
import logger from "../logger.js";

export const updatePet = async (
  interaction: any,
  userId: string,
  url: string,
  everywhere: boolean = false,
  reason: string | null = null,
  slot: number,
) => {
  let guildSettings: any, logChannel: any, row: any;
  const inServer = interaction.guild;
  let loggermsg: string;
  const petIndex = slot - 1;
  const target = interaction.user;

  const guild = interaction.guildId ?? interaction.channelId;

  if (interaction.context === 0 && inServer != null) {
    guildSettings = await BotData.findOne({
      where: {
        guild_id: guild,
      },
    });
    logChannel = await interaction.guild.channels.fetch(
      guildSettings!.get("log_channel"),
    );
  }

  const cmd = interaction.commandName;

  try {
    if (everywhere) {
      const records = await PetData.findAll({
        where: {
          user_id: userId,
        },
      });

      for (const record of records as any[]) {
        const imagesArray = JSON.parse(
          JSON.stringify((record as any).get("images") || []),
        );

        imagesArray[petIndex] = url;

        await PetData.update(
          { images: imagesArray },
          {
            where: {
              id: (record as any).get("id"),
            },
          },
        );
      }
    } else {
      const record: any = await PetData.findOne({
        where: {
          user_id: userId,
          guild_id: guild,
        },
      });

      const imagesArray = JSON.parse(
        JSON.stringify(record.get("images") || []),
      );

      imagesArray[petIndex] = url;

      await PetData.update(
        { images: imagesArray },
        {
          where: {
            id: record.get("id"),
          },
        },
      );
    }
  } catch (error: any) {
    logger.error(
      { error: error },
      "Something went wrong with updating the user image.",
    );
  }

  if (interaction.context === 0 && inServer != null) {
    if (cmd === "change-pet") {
      await interaction.reply({
        content: "Updated your image to the new url",
        flags: MessageFlags.Ephemeral,
      });

      row = new ButtonBuilder()
        .setCustomId("reset-pet")
        .setLabel("Reset Pet")
        .setStyle(ButtonStyle.Danger);
      reason = undefined as any;
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
      "Updated Pet Image",
      logMsg,
      logChannel,
      interaction.user,
      url,
      row,
      [255, 165, 0] as any,
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

export default { updatePet };
