const {
	ContextMenuCommandBuilder,
	ApplicationCommandType,
	EmbedBuilder,
} = require("discord.js");
const botData = require("../../data/bot_settings.json");

module.exports = {
	data: new ContextMenuCommandBuilder()
		.setName("ooc")
		.setType(ApplicationCommandType.Message),
	async execute(interaction) {
		const message = interaction.targetMessage;
		const guild = interaction.guildId;
		const oocChannel = await interaction.guild.channels.fetch(
			botData[guild]["ooc"]
		);
		const author = await interaction.guild.members.fetch(message.author.id);

		let oocEmbed = new EmbedBuilder()
			.setAuthor({
				name: author.displayName,
				iconURL: author.displayAvatarURL(),
			})
			.setDescription(message.content);

		await interaction.reply({
			content: `Message sent to <#${oocChannel.id}>`,
            ephemeral: true,
		});

        const oocMsg = await oocChannel.send({
            embeds: [oocEmbed],
        })

        oocMsg.react('⬆️').then(() => oocMsg.react('⬇️'))
        
	},
};