import { ButtonStyle, ButtonBuilder, MessageFlags } from "discord.js";
import { BotData, ActionData } from "./db.js";
import { log } from "./log.js";
import logger from "../logger.js";
import { ACTIONS, ActionType as ActionKind } from "../types/constants.js";

const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

export const updateAction = async (
  actionKind: ActionKind,
  interaction: any,
  userId: string,
  url: string,
  everywhere: boolean = false,
  reason: string | null = null,
  slot: number,
) => {
  const config = ACTIONS[actionKind];
  let guildSettings: any, logChannel: any, row: any;
  const inServer = interaction.guild;
  let loggermsg: string;
  const imageIndex = slot - 1;
  const target = interaction.user;
  const guild = interaction.guildId ?? interaction.channelId;

  if (interaction.context === 0 && inServer != null) {
    guildSettings = await BotData.findOne({
      where: { guild_id: guild },
    });
    if (guildSettings) {
      logChannel = await interaction.guild.channels.fetch(
        guildSettings.get("log_channel"),
      );
    }
  }

  const cmd = interaction.commandName;

  try {
    if (everywhere) {
      const records = await ActionData.findAll({
        where: { user_id: userId, action_type: actionKind },
      });

      for (const record of records as any[]) {
        const imagesArray = JSON.parse(
          JSON.stringify((record as any).get("images") || []),
        );
        imagesArray[imageIndex] = url;
        await ActionData.update(
          { images: imagesArray },
          { where: { id: (record as any).get("id") } },
        );
      }
    } else {
      const record: any = await ActionData.findOne({
        where: {
          user_id: userId,
          location_id: guild,
          action_type: actionKind,
        },
      });
      const imagesArray = JSON.parse(
        JSON.stringify(record.get("images") || []),
      );
      imagesArray[imageIndex] = url;
      await ActionData.update(
        { images: imagesArray },
        { where: { id: record.get("id") } },
      );
    }
  } catch (error: any) {
    logger.error(
      { error: error },
      "Something went wrong with updating the user image.",
    );
  }

  if (interaction.context === 0 && inServer != null) {
    if (cmd === `change-${actionKind}`) {
      await interaction.editReply({
        content: "Updated your image to the new url",
        flags: MessageFlags.Ephemeral,
      });
      row = new ButtonBuilder()
        .setCustomId(`reset-${actionKind}`)
        .setLabel(`Reset ${capitalize(config.noun)}`)
        .setStyle(ButtonStyle.Danger);
      reason = undefined as any;
    } else {
      await interaction.editReply({
        content: `Updated ${target.username}'s ${actionKind} image to the new url`,
        flags: MessageFlags.Ephemeral,
      });
      row = undefined;
    }

    const logMsg = `> **User**: ${target.username} (<@${target.id}>)
    > **Slot**: ${slot}
    > **Reason**: ${reason}`;

    await log(
      `Updated ${capitalize(config.noun)} Image`,
      logMsg,
      logChannel,
      interaction.user,
      url,
      row,
      [255, 165, 0] as any,
    );
    loggermsg = `Updated ${target.username} image ${slot} to the new url in ${interaction.guild.name}`;
  } else {
    await interaction.editReply({
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

export default { updateAction };
