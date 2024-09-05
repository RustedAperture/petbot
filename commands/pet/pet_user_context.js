const {
	ContextMenuCommandBuilder,
	EmbedBuilder,
	ApplicationCommandType,
	ApplicationIntegrationType,
	InteractionContextType,
} = require("discord.js");
const { checkUser } = require("../../utilities/check_user");
const { petData } = require("./../../utilities/db");

module.exports = {
	data: new ContextMenuCommandBuilder()
		.setName("pet-user")
		.setType(ApplicationCommandType.User)
		.setIntegrationTypes([
			ApplicationIntegrationType.GuildInstall,
			ApplicationIntegrationType.UserInstall,
		])
		.setContexts([
			InteractionContextType.BotDM,
			InteractionContextType.Guild,
			InteractionContextType.PrivateChannel,
		]),
	async execute(interaction) {
		let target, author, guild, petEmbed;

		if (interaction.context == 0) {
			target = interaction.targetMember;
			author = interaction.member;
			guild = interaction.guildId;
		} else {
			target = interaction.targetUser;
			author = interaction.user;
			guild = interaction.channelId;
		}

		await checkUser(target, guild, interaction);
		await checkUser(author, guild, interaction);

		const petTarget = await petData.findOne({
			where: { user_id: target.id, guild_id: guild },
		});
		const petAuthor = await petData.findOne({
			where: { user_id: author.id, guild_id: guild },
		});

		petTarget.increment("has_been_pet");
		petAuthor.increment("has_pet");

		if (interaction.context == 0) {
			petEmbed = new EmbedBuilder()
				.setColor(target.displayHexColor)
				.setTitle(`${target.displayName} has been pet`)
				.setAuthor({
					name: author.displayName,
					iconURL: author.displayAvatarURL(),
				})
				.setImage(petTarget.get("pet_img"))
				.setFooter({
					text: `${target.displayName} has been pet ${
						petTarget.get("has_been_pet") + 1
					} times`,
					iconURL: target.displayAvatarURL(),
				});
		} else {
			petEmbed = new EmbedBuilder()
				.setColor(target.accentColor)
				.setTitle(`${target.globalName} has been pet`)
				.setAuthor({
					name: author.globalName,
					iconURL: author.displayAvatarURL(),
				})
				.setImage(petTarget.get("pet_img"))
				.setFooter({
					text: `${target.globalName} has been pet ${
						petTarget.get("has_been_pet") + 1
					} times`,
					iconURL: target.displayAvatarURL(),
				});
		}

		await interaction.reply({
			content: `<@${target.id}>`,
			embeds: [petEmbed],
		});
	},
};
