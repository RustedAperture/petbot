const {
	ContextMenuCommandBuilder,
	ApplicationCommandType,
	ApplicationIntegrationType,
	InteractionContextType,
	MessageFlags,
	ContainerBuilder,
	SectionBuilder,
	TextDisplayBuilder,
	ThumbnailBuilder,
	MediaGalleryBuilder,
} = require("discord.js");
const { petData, botData } = require("./../../utilities/db");
const { hexToRGBTuple } = require("../../utilities/helper");

module.exports = {
	data: new ContextMenuCommandBuilder()
		.setName("petStats")
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
		let target;
		let inServer = interaction.guild;
		const guild = interaction.guildId ?? interaction.channelId;

		if (interaction.context === 0 && inServer != null) {
			target = interaction.targetMember;
		} else {
			target = interaction.targetUser;
		}

		await target.fetch(true);

		const pet = await petData.findOne({
			where: {
				user_id: target.id,
				guild_id: guild,
			},
		});

        const totalHasBeenPet = await petData.sum('has_been_pet', {
			where: {
				user_id: target.id
			},
		});

		if (!pet) {
			await interaction.reply({
				content: "The user has no pet data",
				flags: MessageFlags.Ephemeral,
			});
		} else {
			const targetName = inServer
				? target.displayName
				: target.globalName;
				const targetColor = inServer
				? hexToRGBTuple(target.displayHexColor)
				: target.accentColor;

			const petStatsContainer = new ContainerBuilder();

			petStatsContainer.setAccentColor(targetColor);
			
			const targetSection = new SectionBuilder();

			const targetText = new TextDisplayBuilder().setContent(
				[
					`# ${targetName} pet stats`,
					`**Times pet here**: ${pet.get("has_been_pet")}x`,
					`**Total times pet**: ${totalHasBeenPet}x`,
					`**Used pet**: ${pet.get("has_pet")}x`
				].join('\n'),
			);
			const targetThumbnail = new ThumbnailBuilder().setURL(target.displayAvatarURL());

			targetSection.addTextDisplayComponents(targetText);
			targetSection.setThumbnailAccessory(targetThumbnail);

			petStatsContainer.addSectionComponents(targetSection);

			const petGallery = new MediaGalleryBuilder().addItems([{
				description: "Pet Image",
				media: {
					url: `${pet.get("pet_img")}`
				}
			}]);

			if (pet.get("pet_img_two") != '' && pet.get("pet_img_two") != null) {
				petGallery.addItems([{
					description: "Pet Image 2",
					media: {
						url: `${pet.get("pet_img_two")}`
					}
				}]);
			}

			if (pet.get("pet_img_three") != '' && pet.get("pet_img_three") != null) {
				petGallery.addItems([{
					description: "Pet Image 3",
					media: {
						url: `${pet.get("pet_img_three")}`
					}
				}]);
			}

			if (pet.get("pet_img_four") != '' && pet.get("pet_img_four") != null) {
				petGallery.addItems([{
					description: "Pet Image 4",
					media: {
						url: `${pet.get("pet_img_four")}`
					}
				}]);
			}

			petStatsContainer.addMediaGalleryComponents(petGallery);

			await interaction.reply({
				components: [petStatsContainer],
				flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
			});
		}
	},
};
