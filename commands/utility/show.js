const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { log } = require('../../utilities/log');
const botData = require('../../data/bot_settings.json')

module.exports = {
    data: new SlashCommandBuilder()
		.setName('show')
		.setDescription('Reveals a channel from a specific user')
        .addUserOption(option =>
            option
                .setName('target')
                .setDescription('The user you want to hide channel from')
                .setRequired(false)
        )
        .addChannelOption(option =>
            option
                .setName('channel')
                .setDescription('The channel you want to hide')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),
	async execute(interaction) {
        let channel = interaction.options.getChannel('channel')
        let target = interaction.options.getMember('target')
        const guild = interaction.guildId
        const logChannel = await interaction.guild.channels.fetch(botData[guild]["log_channel"])

        if(!channel) {
            channel = interaction.channel
        }

        if(!target) {
            target = interaction.member
        }

        const logMsg = `<#${channel.id}> has been revealed to <@${target.id}>`

        channel.permissionOverwrites.create(target, { ViewChannel: true });

        await log('Channel Permission Update!', logMsg, logChannel)
        interaction.reply({content: logMsg, ephemeral: true})
    }
}