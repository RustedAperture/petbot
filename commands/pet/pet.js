const { SlashCommandBuilder, EmbedBuilder  } = require('discord.js');
const fs = require('fs').promises;
const { checkUser } = require('../../utilities/check_user')

async function increaseIntegerInJson(filePath, guild, userId, key) {
    try {
        // Read the JSON file
        const data = await fs.readFile(filePath, 'utf-8');
        const jsonData = JSON.parse(data);
    
        // Check if the guild ID exists
        if (!jsonData.hasOwnProperty(guild)) {
            throw new Error(`Duild ID "${guild}" not found in JSON file.`);
        }

        // Check if the user ID exists
        if (!jsonData[guild].hasOwnProperty(userId)) {
            throw new Error(`User ID "${userId}" not found in JSON file.`);
        }
    
        // Check if the pet data exists and has_pet is an integer
        if (!jsonData[guild][userId].hasOwnProperty(key) || typeof jsonData[guild][userId][key] !== 'number') {
            throw new Error(`Key "${key}" not found or not an integer for user "${userId}".`);
        }
    
        // Increase the value
        jsonData[guild][userId][key]++;
  
        // Write the updated JSON data back to the file
        await fs.writeFile(filePath, JSON.stringify(jsonData, null, 2), 'utf-8');
    } catch (error) {
        console.error("Error increasing integer:", error);
    }
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('pet')
		.setDescription('Pets another user')
        .addUserOption(option =>
            option
                .setName('target1')
                .setDescription('The user you want to pet')
                .setRequired(true)
        )
        .addUserOption(option =>
            option
                .setName('target2')
                .setDescription('The user you want to pet')
                .setRequired(false)
        )
        .addUserOption(option =>
            option
                .setName('target3')
                .setDescription('The user you want to pet')
                .setRequired(false)
        ),
	async execute(interaction) {
        const target1 = await interaction.options.getMember('target1');
        const target2 = await interaction.options.getMember('target2');
        const target3 = await interaction.options.getMember('target3');
        const author = interaction.member
        const guild = interaction.guildId

        const targets = new Set([target1])
        if (target2) {
            targets.add(target2);
        }
        if (target3) {
            targets.add(target3);
        }

        const uniqueTargets = [...targets];

        await checkUser(author, guild)

        let embeds = []
        
        for (const target of uniqueTargets) {
            const data = await fs.readFile('data/pet_data.json', 'utf-8');
            const petData = JSON.parse(data);

            await target.fetch(true)

            await checkUser(target, guild)

            await increaseIntegerInJson('data/pet_data.json', guild, target.id, 'has_been_pet')
            await increaseIntegerInJson('data/pet_data.json', guild, author.id, 'has_pet')

            const petEmbed = new EmbedBuilder()
                .setColor(target.displayHexColor)
                .setTitle(`${target.displayName} has been pet`)
                .setAuthor({ name: author.displayName, iconURL: author.displayAvatarURL()})
                .setImage(petData[guild][target.id]["url"])
                .setFooter({ text: `${target.displayName} has been pet ${petData[guild][target.id]["has_been_pet"]} times`, iconURL: target.displayAvatarURL() });
        
            embeds.push(petEmbed)
        }

		for (let i = 0; i < uniqueTargets.length; i++) {
            const target = uniqueTargets[i];
            if (i == 0) {
                await interaction.reply({ content: `<@${target.id}>`, embeds: [embeds[i]]});
            } else {
                await interaction.channel.send({ content: `<@${target.id}>`, embeds: [embeds[i]]});
            }
        }
	},
};