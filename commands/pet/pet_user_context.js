const {
	ContextMenuCommandBuilder,
	EmbedBuilder,
	ApplicationCommandType,
} = require("discord.js");
const { checkUser } = require("../../utilities/check_user");
const { petData } = require('./../../utilities/db');

module.exports = {
	data: new ContextMenuCommandBuilder()
		.setName("pet-user")
		.setType(ApplicationCommandType.User),
	async execute(interaction) {
		const target = interaction.targetMember;
		const author = interaction.member;
		const guild = interaction.guildId;

		await checkUser(target, guild);
		await checkUser(author, guild);

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

		await interaction.reply({
			content: `<@${target.id}>`,
			embeds: [petEmbed],
		});
	},
};
