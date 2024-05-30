const fs = require("fs").promises;
const botData = require("../data/bot_settings.json");
const { log } = require("../utilities/log");

exports.resetPet = async (interaction) => {
	const guild = interaction.guildId;
    const msg = await interaction.message
	const channel = await interaction.guild.channels.fetch(
		botData[guild]["log_channel"]
	);
	const mention = msg.embeds[0].fields[0]["value"].replace(
		/<@!?|>/g,
		""
	);
	const target = await interaction.guild.members.fetch(mention);
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
	await interaction.reply({
		content: `${mention} has been reset`,
		ephemeral: true,
	});
    msg.edit({components: []});
};
