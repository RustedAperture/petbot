export * from "../src/utilities/resetAction.js";
import { ACTIONS, ActionType as ActionKind } from "../types/constants.js";

const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

export const resetAction = async (
  actionKind: ActionKind,
  interaction: any,
  userId: string,
  slot: number,
  everywhere: boolean = false,
) => {
  const config = ACTIONS[actionKind];
  let guildSettings: any, logChannel: any, img: string | null | undefined;
  const inServer = interaction.guild;
  const target = interaction.user;
  const guild = interaction.guildId ?? interaction.channelId;
  let loggermsg = "";

  if (interaction.context === 0 && inServer != null) {
    guildSettings = await (BotData.findOne as any)({
      where: {
        guild_id: guild,
      },
    });

    if (guildSettings) {
      logChannel = await interaction.guild.channels.fetch(
        guildSettings.get("log_channel"),
      );
    }

    const baseImage =
      guildSettings?.get(config.guildSettingField) ?? config.defaultImage;
    img = slot === 1 ? baseImage : null;

    const logMsg = `> **User**: ${target.username} (<@${target.id}>)
    > **Slot**: ${slot}${everywhere ? "\n    > **Everywhere**: true" : ""}`;

    await log(
      `Reset ${capitalize(config.noun)} Image`,
      logMsg,
      logChannel,
      target,
      img ?? null,
      null,
      [255, 0, 0] as any,
    );

    logger.debug(
      `Reset ${target.displayName} image ${slot} to the base image in ${interaction.guild.name}`,
    );
  } else {
    img = slot === 1 ? config.defaultImage : null;
    logger.debug(
      `reset ${interaction.user.displayName} image ${slot} to the base image in ${guild}`,
    );
  }

  try {
    logger.debug(
      `resetting ${userId} image ${slot} to the base image for ${guild}`,
    );

    if (everywhere) {
      const records = await ActionData.findAll({
        where: { user_id: userId, action_type: actionKind },
      });

      if (!records || records.length === 0) {
        logger.error(
          `No ${actionKind} records found for user ${userId} to reset everywhere`,
        );
        return;
      }

      for (const record of records as any[]) {
        const imagesArray = JSON.parse(
          JSON.stringify((record as any).get("images") || []),
        );
        if (slot > 1) {
          imagesArray.splice(slot - 1, 1);
        } else {
          imagesArray[slot - 1] = img;
        }
        const cleanedImages = imagesArray.filter(
          (image: string) => image && image.trim() !== "",
        );
        await ActionData.update(
          { images: cleanedImages },
          { where: { id: (record as any).get("id") } },
        );
      }

      loggermsg = `Reset ${target.username} image ${slot} to the base image everywhere`;
    } else {
      const record: any = await ActionData.findOne({
        where: {
          user_id: userId,
          location_id: guild,
          action_type: actionKind,
        },
      });

      if (!record) {
        logger.error(
          `No ${actionKind} record found for user ${userId} in ${guild}`,
        );
        return;
      }

      const imagesArray = JSON.parse(
        JSON.stringify(record.get("images") || []),
      );
      if (slot > 1) {
        imagesArray.splice(slot - 1, 1);
      } else {
        imagesArray[slot - 1] = img;
      }
      const cleanedImages = imagesArray.filter(
        (image: string) => image && image.trim() !== "",
      );
      await ActionData.update(
        { images: cleanedImages },
        {
          where: {
            id: record.get("id"),
          },
        },
      );

      loggermsg = `Reset ${target.username} image ${slot} to the base image for ${guild}`;
    }
  } catch (error: any) {
    logger.error(
      { error: error },
      "Something went wrong with reseting the user image.",
    );
  }

  logger.debug(loggermsg);
};

export default { resetAction };
