const { ButtonStyle, ButtonBuilder, ActionRowBuilder } = require("discord.js");
const { botData, petData } = require("./../../utilities/db");
const { log } = require("../utilities/log");

exports.updatePet = async (interaction, userId, url, reason=null) => {
    const cmd = interaction.commandName;
	const guild = interaction.guildId;
	const guildSettings = await botData.findOne({
		where: {
			guild_id: guild,
		},
	});
	const logChannel = await interaction.guild.channels.fetch(
		guildSettings.get("log_channel")
	);
	const target = await interaction.guild.members.fetch(userId);

    await petData.update(
		{
			pet_img: url,
		},
		{
			where: {
				user_id: target.id,
				guild_id: guild,
			},
		}
	);
    
    const logMsg = `${target.displayName} pet Image has been updated`;
    
    if (cmd == "change-pet") {
        await interaction.reply({
            content: "Updated your image to the new url",
            ephemeral: true,
        });
        const reset = new ButtonBuilder()
            .setCustomId("reset-pet")
            .setLabel("Reset Pet")
            .setStyle(ButtonStyle.Danger);
        row = new ActionRowBuilder().addComponents(reset);
        reason = undefined
    } else {
        await interaction.reply({
            content: `Updated ${target.displayName} image to the new url`,
            ephemeral: true,
        });
        row = undefined
    }

    await log(
        "Updated Pet Image",
        logMsg,
        logChannel,
        `<@${interaction.member.id}>`,
        url,
        reason,
        row
    );
};
