const {
	ContextMenuCommandBuilder,
	EmbedBuilder,
	ApplicationCommandType,
} = require("discord.js");
const fs = require("fs").promises;
const botdata = require("../../data/bot_settings.json");

async function increaseIntegerInJson(filePath, guild, userId, key) {
	try {
		// Read the JSON file
		const data = await fs.readFile(filePath, "utf-8");
		const jsonData = JSON.parse(data);

		// Check if the guild ID exists
		if (!jsonData.hasOwnProperty(guild)) {
			throw new Error(`Duild ID "${guild}" not found in JSON file.`);
		}

		// Check if the user ID exists
		if (!jsonData[guild].hasOwnProperty(userId)) {
			throw new Error(`User ID "${userId}" not found in JSON file.`);
		}

		// Check if the pet data exists and has_pet is an integer
		if (
			!jsonData[guild][userId].hasOwnProperty(key) ||
			typeof jsonData[guild][userId][key] !== "number"
		) {
			throw new Error(
				`Key "${key}" not found or not an integer for user "${userId}".`
			);
		}

		// Increase the value
		jsonData[guild][userId][key]++;

		// Write the updated JSON data back to the file
		await fs.writeFile(
			filePath,
			JSON.stringify(jsonData, null, 2),
			"utf-8"
		);
	} catch (error) {
		console.error("Error increasing integer:", error);
	}
}

async function checkUser(user, guild) {
	const data = await fs.readFile("data/pet_data.json", "utf-8");
	const petdata = JSON.parse(data);

	// Check if the user ID exists
	if (!petdata[guild].hasOwnProperty(user.id)) {
		petdata[guild][user.id] = {
			url: botdata[guild]["default_pet"],
			has_pet: 0,
			has_been_pet: 0,
		};
		await fs.writeFile(
			"data/pet_data.json",
			JSON.stringify(petdata, null, 2),
			"utf-8"
		);
	}
}

module.exports = {
	data: new ContextMenuCommandBuilder()
		.setName("pet-message")
		.setType(ApplicationCommandType.Message),
	async execute(interaction) {
		const message = interaction.targetMessage;
		const author = interaction.member;
		const guild = interaction.guildId;
		const target = await interaction.guild.members.fetch(message.author.id);

		await checkUser(target, guild);
		await checkUser(author, guild);

		const data = await fs.readFile("data/pet_data.json", "utf-8");
		const petdata = JSON.parse(data);

		increaseIntegerInJson(
			"data/pet_data.json",
			guild,
			target.id,
			"has_been_pet"
		);
		increaseIntegerInJson(
			"data/pet_data.json",
			guild,
			author.id,
			"has_pet"
		);

		const petEmbed = new EmbedBuilder()
			.setColor(target.displayHexColor)
			.setTitle(`${target.displayName} has been pet`)
			.setAuthor({
				name: author.displayName,
				iconURL: author.displayAvatarURL(),
			})
			.setImage(petdata[guild][target.id]["url"])
			.setFooter({
				text: `${target.displayName} has been pet ${
					petdata[guild][target.id]["has_been_pet"]
				} times`,
				iconURL: target.displayAvatarURL(),
			});

		await interaction.reply({
			content: `<@${target.id}>`,
			embeds: [petEmbed],
		});
	},
};
