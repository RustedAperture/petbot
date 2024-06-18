const { log } = require("./log");
const { botData, petData } = require("./db");

exports.resetPet = async (interaction, userId) => {
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
			pet_img: guildSettings.get("default_pet_image"),
		},
		{
			where: {
				user_id: target.id,
				guild_id: guild,
			},
		}
	);
	let log_msg = `${target.displayName} pet image has been reset`;
	await log(
		"Updated Pet Image",
		log_msg,
		logChannel,
		`<@${interaction.member.id}>`,
		botData[guild]["default_pet"]
	);
};
