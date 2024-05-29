const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');
const fs = require('fs').promises;
const { checkUser } = require('../../utilities/check_user');
const { log } = require('../../utilities/log');
const botData = require('../../data/bot_settings.json')
const { checkImage } = require('../../utilities/check_image')


module.exports = {
    data: new SlashCommandBuilder()
		.setName('set-pet')
		.setDescription('Sets a pet for a specific user')
        .addUserOption(option =>
            option
                .setName('target')
                .setDescription('The user you want to change')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('url')
                .setDescription('The url of the image')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('The reason for changing the image')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),
	async execute(interaction) {
        const url = interaction.options.getString('url')
        const target = interaction.options.getMember('target')
        const reason = interaction.options.getString('reason')
        const guild = interaction.guildId
        const channel = await interaction.guild.channels.fetch(botData[guild]["log_channel"])

        const petRead = await fs.readFile('data/pet_data.json', 'utf-8');
        const petData = JSON.parse(petRead);

        if (!reason) {
            reason = "None"
        }

        await checkUser(target, guild)

        const logMsg = `${target.displayName} pet Image has been updated`

        if (await checkImage(url)){
            petData[guild][target.id]["url"] = url
            await fs.writeFile('data/pet_data.json', JSON.stringify(petData, null, 2), 'utf-8');
            await interaction.reply({ content: `Updated ${target.displayName} image to the new url`, ephemeral: true });

            await log('Updated Pet Image', logMsg, channel, `<@${interaction.member.id}>`, url, reason)
        } else {
            await interaction.reply({ content: `Invalid url please try again.`, ephemeral: true });
        }
    }
}