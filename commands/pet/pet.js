const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { checkUser } = require("../../utilities/check_user");
const { petData } = require('./../../utilities/db');

module.exports = {
	data: new SlashCommandBuilder()
		.setName("pet")
		.setDescription("Pets another user")
		.addUserOption((option) =>
			option
				.setName("target1")
				.setDescription("The user you want to pet")
				.setRequired(true)
		)
		.addUserOption((option) =>
			option
				.setName("target2")
				.setDescription("The user you want to pet")
				.setRequired(false)
		)
		.addUserOption((option) =>
			option
				.setName("target3")
				.setDescription("The user you want to pet")
				.setRequired(false)
		),
	async execute(interaction) {
		const target1 = await interaction.options.getMember("target1");
		const target2 = await interaction.options.getMember("target2");
		const target3 = await interaction.options.getMember("target3");
		const author = interaction.member;
		const guild = interaction.guildId;

		const targets = new Set([target1]);
		if (target2) {
			targets.add(target2);
		}
		if (target3) {
			targets.add(target3);
		}

		const uniqueTargets = [...targets];

		await checkUser(author, guild);

		let embeds = [];

		for (const target of uniqueTargets) {
			await target.fetch(true);
			await checkUser(target, guild);

			const petTarget = await petData.findOne({ where: { user_id: target.id } });
			const petAuthor = await petData.findOne({ where: { user_id: author.id } });

			petTarget.increment("has_been_pet");
			petAuthor.increment("has_pet");

			const petEmbed = new EmbedBuilder()
				.setColor(target.displayHexColor)
				.setTitle(`${target.displayName} has been pet`)
				.setAuthor({
					name: author.displayName,
					iconURL: author.displayAvatarURL(),
				})
				.setImage(petTarget.get('pet_img'))
				.setFooter({
					text: `${target.displayName} has been pet ${
						petTarget.get('has_been_pet')+1
					} times`,
					iconURL: target.displayAvatarURL(),
				});

			embeds.push(petEmbed);
		}

		for (let i = 0; i < uniqueTargets.length; i++) {
			const target = uniqueTargets[i];
			if (i == 0) {
				await interaction.reply({
					content: `<@${target.id}>`,
					embeds: [embeds[i]],
				});
			} else {
				await interaction.channel.send({
					content: `<@${target.id}>`,
					embeds: [embeds[i]],
				});
			}
		}
	},
};
