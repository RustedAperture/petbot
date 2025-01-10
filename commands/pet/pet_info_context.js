const {
	ContextMenuCommandBuilder,
	EmbedBuilder,
	ApplicationIntegrationType,
	InteractionContextType,
    ApplicationCommandType,
    MessageFlags
} = require("discord.js");
const { petData, botData } = require("./../../utilities/db");

function createEmbed(petEmbed) {
    if (petEmbed == '') {
        petEmbed = null;
    }
    return new EmbedBuilder()
        .setURL("https://discord.js")
        .setImage(
            petEmbed ??
            "https://github.com/RustedAperture/Stickers/blob/main/belly%20placeholder.png?raw=true"
        );
}

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
				? target.displayHexColor
				: target.accentColor;

			const petEmbed = new EmbedBuilder()
				.setColor(targetColor)
				.setAuthor({
					name: targetName,
					iconURL: target.displayAvatarURL(),
				})
				.addFields(
					{
						name: "Times pet here",
						value: `${pet.get("has_been_pet")}x`,
						inline: true,
					},
                    {
						name: "Total times pet",
						value: `${totalHasBeenPet}x`,
						inline: true,
					},
					{
						name: "Used pet",
						value: `${pet.get("has_pet")}x`,
						inline: true,
					},
					{
						name: "Pet Images",
						value: "These are the images for the specified user.",
					}
				)
				.setURL("https://discord.js")
				.setImage(`${pet.get("pet_img")}`);

			let petEmbed2 = createEmbed(pet.get("pet_img_two"));
			let petEmbed3 = createEmbed(pet.get("pet_img_three"));
			let petEmbed4 = createEmbed(pet.get("pet_img_four"));

			await interaction.reply({
				embeds: [petEmbed, petEmbed2, petEmbed3, petEmbed4],
				flags: MessageFlags.Ephemeral,
			});
		}
	},
};
