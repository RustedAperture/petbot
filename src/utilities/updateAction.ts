import { ButtonStyle, ButtonBuilder, MessageFlags } from "discord.js";
import { drizzleDb } from "../db/connector.js";
import { actionData, botData } from "../db/schema.js";
import { eq, and } from "drizzle-orm";
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
    const rows: any = await drizzleDb
      .select()
      .from(botData)
      .where(eq(botData.guildId, guild))
      .limit(1);
    guildSettings = rows?.[0] ?? null;
    if (guildSettings) {
      const logId = guildSettings.logChannel;
      logChannel = await interaction.guild.channels.fetch(logId as any);
    }
  }

  const cmd = interaction.commandName;

  try {
    if (everywhere) {
      const rows: any[] = await drizzleDb
        .select()
        .from(actionData)
        .where(
          and(
            eq(actionData.userId, userId),
            eq(actionData.actionType, actionKind),
          ),
        );

      for (const r of rows) {
        const imagesArray = r.images ? r.images : [];
        imagesArray[imageIndex] = url;
        await drizzleDb
          .update(actionData)
          .set({
            images: imagesArray,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(actionData.id, r.id));
      }
    } else {
      const rows: any[] = await drizzleDb
        .select()
        .from(actionData)
        .where(
          and(
            eq(actionData.userId, userId),
            eq(actionData.locationId, guild),
            eq(actionData.actionType, actionKind),
          ),
        )
        .limit(1);
      const record = rows[0];
      const imagesArray: string[] = (record?.images ?? []) as string[];
      imagesArray[imageIndex] = url;
      if (record) {
        await drizzleDb
          .update(actionData)
          .set({
            images: imagesArray,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(actionData.id, record.id));
      }
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
