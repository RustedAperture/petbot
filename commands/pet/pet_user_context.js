const {
	ContextMenuCommandBuilder,
	ApplicationCommandType,
	ApplicationIntegrationType,
	InteractionContextType,
	ContainerBuilder,
	TextDisplayBuilder,
	MediaGalleryBuilder,
	MessageFlags,
} = require("discord.js");
const { checkUser } = require("../../utilities/check_user");
const { petData } = require("./../../utilities/db");
const { getPetSlot, countPetImages, hexToRGBTuple } = require("./../../utilities/helper");
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

		let guild = interaction.guildId ?? interaction.channelId;

		await target.fetch(true);

		await checkUser(target, guild);
		await checkUser(author, guild);

		const petTarget = await petData.findOne({
			where: { user_id: target.id, guild_id: guild },
		});
		const petAuthor = await petData.findOne({
			where: { user_id: author.id, guild_id: guild },
		});

		let numPetImages = countPetImages(petTarget);
		let randomPet = Math.floor(Math.random() * numPetImages) + 1;
		let petSlot = getPetSlot(randomPet);

		petTarget.increment("has_been_pet");
		petAuthor.increment("has_pet");

		const targetName = inServer ? target.displayName : target.globalName;
		const targetColor = inServer
			? hexToRGBTuple(target.displayHexColor)
			: target.accentColor;

		const petContainer = new ContainerBuilder();

		petContainer.setAccentColor(targetColor);

		const targetText = new TextDisplayBuilder().setContent(`# <@${target.id}> has been pet!`);

		const petGallery = new MediaGalleryBuilder().addItems([{
			description: "Pet Image",
			media: {
				url: petTarget.get(petSlot)
			}
		}])

		petContainer.addMediaGalleryComponents(petGallery);

		petContainer.addTextDisplayComponents(targetText);

		const countText = new TextDisplayBuilder().setContent(`-# ${targetName} has been pet ${
					petTarget.get("has_been_pet") + 1
				} times | Command ran by ${author.displayName}`);
		
		petContainer.addTextDisplayComponents(countText);

		await interaction.reply({
			components: [petContainer],
			flags: MessageFlags.IsComponentsV2,
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
