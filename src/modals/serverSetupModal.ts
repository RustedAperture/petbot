import {
  EmbedBuilder,
  MessageFlags,
  type ModalSubmitInteraction,
} from "discord.js";
import { drizzleDb } from "../db/connector.js";
import { botData } from "../db/schema.js";
import { eq } from "drizzle-orm";

export const customId = "server-setup-modal";

export async function handleServerSetupModal(modal: ModalSubmitInteraction) {
  await modal.deferReply({ flags: MessageFlags.Ephemeral });

  const nickname = modal.fields.getTextInputValue("nicknameInput");
  const sleepImage = modal.fields.getTextInputValue("sleepImageInput");

  let logChannelId: string | null = null;
  try {
    logChannelId = modal.fields.getSelectedChannels("logChannelSelect")?.[0];
  } catch {
    // some discord.js versions may not support channel selects in ModalFields
  }

  try {
    const guildId = modal.guildId;
    if (!guildId) {
      throw new Error("Missing guild id on modal submission");
    }

    const gsRows: any[] = await drizzleDb
      .select()
      .from(botData)
      .where(eq(botData.guildId, guildId))
      .limit(1);
    const guildSettings = gsRows?.[0] ?? null;

    const finalNickname =
      nickname !== undefined ? nickname : (guildSettings?.nickname ?? "");
    const finalSleepImage =
      sleepImage !== undefined ? sleepImage : (guildSettings?.sleepImage ?? "");
    const finalLogChannel = logChannelId ?? guildSettings?.logChannel ?? "";

    if (!guildSettings) {
      await drizzleDb.insert(botData).values({
        guildId,
        defaultImages: null,
        logChannel: finalLogChannel,
        nickname: finalNickname,
        sleepImage: finalSleepImage,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as any);
    } else {
      await drizzleDb
        .update(botData)
        .set({
          logChannel: finalLogChannel,
          nickname: finalNickname,
          sleepImage: finalSleepImage,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(botData.guildId, guildId));
    }

    if (modal.guild) {
      const application = modal.client.application;
      if (!application?.id) {
        console.warn(
          "Could not update bot nickname: Discord application details are not available.",
        );
      } else {
        try {
          const botId = application.id;
          const botMember = await modal.guild.members.fetch(botId);
          await botMember.setNickname(finalNickname || null);
        } catch (err) {
          console.warn("Failed to update bot nickname in guild.", err);
        }
      }
    }

    const summaryEmbed = new EmbedBuilder().setTitle("Setup");
    summaryEmbed.addFields(
      { name: "Nickname", value: finalNickname || "(none)" },
      { name: "Sleep image", value: finalSleepImage || "(none)" },
      {
        name: "Log Channel",
        value: finalLogChannel ? `<#${finalLogChannel}>` : "(none)",
      },
      {
        name: "Triggered by",
        value: `<@${modal.user.id}>`,
      },
    );

    // Send to log channel if configured, otherwise reply ephemerally
    if (finalLogChannel) {
      try {
        const channel =
          (await modal.guild?.channels.fetch(finalLogChannel as any)) ?? null;
        if (channel && channel.isTextBased()) {
          await channel.send({ embeds: [summaryEmbed] });
        }
      } catch (sendErr) {
        console.warn("Failed to send setup summary to log channel.", sendErr);
      }
    }

    await modal.editReply({
      embeds: [summaryEmbed],
    });
  } catch (err) {
    console.error(err);
    await modal.editReply({
      content: "Failed to save server settings.",
    });
  }
}
