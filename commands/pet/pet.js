const {
	SlashCommandBuilder,
	ApplicationIntegrationType,
	InteractionContextType,
	ContainerBuilder,
	TextDisplayBuilder,
	MediaGalleryBuilder,
	MessageFlags,
} = require("discord.js");
const { checkUser } = require("../../utilities/check_user");
const { petData } = require("./../../utilities/db");
const logger = require("./../../logger");
const { getPetSlot, countPetImages, hexToRGBTuple } = require("../../utilities/helper");

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
		)
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
		let target1, target2, target3, author, petEmbed;
		let inServer = interaction.guild;

		if (interaction.context === 0 && inServer != null) {
			target1 = await interaction.options.getMember("target1");
			target2 = await interaction.options.getMember("target2");
			target3 = await interaction.options.getMember("target3");
			author = interaction.member;
		} else {
			target1 = await interaction.options.getUser("target1");
			target2 = await interaction.options.getUser("target2");
			target3 = await interaction.options.getUser("target3");
			author = interaction.user;
		}

		let guild = interaction.guildId ?? interaction.channelId;

		const targets = new Set([target1]);
		if (target2) {
			targets.add(target2);
		}
		if (target3) {
			targets.add(target3);
		}

		const uniqueTargets = [...targets];

		await checkUser(author, guild);

		let containers = [];

		for (const target of uniqueTargets) {
			await target.fetch(true);
			await checkUser(target, guild);

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

			const targetName = inServer
				? target.displayName
				: target.globalName;
			
			const targetColor = inServer
				? hexToRGBTuple(target.displayHexColor)
				: target.accentColor;

			const petContainer = new ContainerBuilder();

			petContainer.setAccentColor(targetColor);

			const targetText = new TextDisplayBuilder().setContent(`# <@${target.id}> has been pet!`);

			petContainer.addTextDisplayComponents(targetText);

			const petGallery = new MediaGalleryBuilder().addItems([{
				description: "Pet Image",
				media: {
					url: petTarget.get(petSlot)
				}
			}])

			petContainer.addMediaGalleryComponents(petGallery);

			const countText = new TextDisplayBuilder().setContent(`-# ${targetName} has been pet ${
						petTarget.get("has_been_pet") + 1
					} times | Command ran by ${author.displayName}`);
			
			petContainer.addTextDisplayComponents(countText);

			containers.push(petContainer);
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
		}

		for (let i = 0; i < uniqueTargets.length; i++) {
			const target = uniqueTargets[i];
			if (i == 0) {
				await interaction.reply({
					components: [containers[i]],
					flags: MessageFlags.IsComponentsV2,
				});
			} else {
				await interaction.followUp({
					components: [containers[i]],
					flags: MessageFlags.IsComponentsV2,
				});
			}
		}
	},
};
