const {
	ContextMenuCommandBuilder,
	EmbedBuilder,
	ApplicationCommandType,
	ApplicationIntegrationType,
	InteractionContextType,
} = require("discord.js");
const { checkUser } = require("../../utilities/check_user");
const { petData } = require("./../../utilities/db");
const logger = require("../../logger");

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
		let target, author, petEmbed;
		let inServer = interaction.guild;

		if (interaction.context === 0 && inServer != null) {
			target = interaction.targetMember;
			author = interaction.member;
		} else {
			target = interaction.targetUser;
			author = interaction.user;
		}

		let guild = interaction.guildId;
		if (guild == null) {
			guild = interaction.channelId;
		}

		await target.fetch(true);

		await checkUser(target, guild, interaction);
		await checkUser(author, guild, interaction);

		const petTarget = await petData.findOne({
			where: { user_id: target.id, guild_id: guild },
		});
		const petAuthor = await petData.findOne({
			where: { user_id: author.id, guild_id: guild },
		});

		let numPetImages = 0;
		if (petTarget.pet_img != "") {
			numPetImages++;
		}
		if (petTarget.pet_img_two != null) {
			numPetImages++;
		}
		if (petTarget.pet_img_three != null) {
			numPetImages++;
		}
		if (petTarget.pet_img_four != null) {
			numPetImages++;
		}

		let randomPet = Math.floor(Math.random() * numPetImages) + 1;
		let petSlot;
		switch (randomPet) {
			case 1:
				petSlot = "pet_img";
				break;
			case 2:
				petSlot = "pet_img_two";
				break;
			case 3:
				petSlot = "pet_img_three";
				break;
			case 4:
				petSlot = "pet_img_four";
				break;
		}

		petTarget.increment("has_been_pet");
		petAuthor.increment("has_pet");

		const targetName = inServer ? target.displayName : target.globalName;
		const targetColor = inServer
			? target.displayHexColor
			: target.accentColor;

		petEmbed = new EmbedBuilder()
			.setColor(targetColor)
			.setTitle(`${targetName} has been pet`)
			.setAuthor({
				name: author.displayName,
				iconURL: author.displayAvatarURL(),
			})
			.setImage(petTarget.get(petSlot))
			.setFooter({
				text: `${targetName} has been pet ${
					petTarget.get("has_been_pet") + 1
				} times`,
				iconURL: target.displayAvatarURL(),
			});

		await interaction.reply({
			content: `<@${target.id}>`,
			embeds: [petEmbed],
		});

		logger.debug(
			{
				Context: `${interaction.context}:${
					inServer ? interaction.guild.name : guild
				}`,
				Trigger: author.displayName,
				Target: targetName,
			},
			`A user has been pet`
		);
	},
};
