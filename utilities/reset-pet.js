const fs = require("fs").promises;
const botData = require("../data/bot_settings.json");
const { log } = require("../utilities/log");

exports.resetPet = async (interaction, userId) => {
	const guild = interaction.guildId;
	const channel = await interaction.guild.channels.fetch(
		botData[guild]["log_channel"]
	);
	const target = await interaction.guild.members.fetch(userId);
	const petRead = await fs.readFile("data/pet_data.json", "utf-8");
	const petData = JSON.parse(petRead);
	petData[guild][target.id]["url"] = botData[guild]["default_pet"];
	await fs.writeFile(
		"data/pet_data.json",
		JSON.stringify(petData, null, 2),
		"utf-8"
	);
	let log_msg = `${target.displayName} pet image has been reset`;
	await log(
		"Updated Pet Image",
		log_msg,
		channel,
		`<@${interaction.member.id}>`,
		botData[guild]["default_pet"]
	);
};
