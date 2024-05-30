const { ButtonStyle, ButtonBuilder, ActionRowBuilder } = require("discord.js");
const fs = require("fs").promises;
const botData = require("../data/bot_settings.json");
const { log } = require("../utilities/log");

exports.updatePet = async (interaction, userId, url, reason=null) => {
    const cmd = interaction.commandName;
	const guild = interaction.guildId;
	const channel = await interaction.guild.channels.fetch(
		botData[guild]["log_channel"]
	);
	const target = await interaction.guild.members.fetch(userId);
	
    const petRead = await fs.readFile("data/pet_data.json", "utf-8");
	const petData = JSON.parse(petRead);

	petData[guild][target.id]["url"] = url;
    
	await fs.writeFile(
		"data/pet_data.json",
		JSON.stringify(petData, null, 2),
		"utf-8"
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
        channel,
        `<@${interaction.member.id}>`,
        url,
        reason,
        row
    );
};
