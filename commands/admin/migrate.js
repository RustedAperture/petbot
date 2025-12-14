const { SlashCommandBuilder, PermissionsBitField } = require("discord.js");
const { petData, botData } = require("./../../utilities/db");
const fs = require("fs").promises;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("migrate")
    .setDescription("migrate from v1 to v2")
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),
  async execute(_interaction) {
    try {
      const petRead = await fs.readFile("data/pet_data.json", "utf-8");
      const oldPetData = JSON.parse(petRead);
      for (const guild in oldPetData) {
        for (const user in oldPetData[guild]) {
          await petData.create({
            user_id: user,
            guild_id: guild,
            pet_img: oldPetData[guild][user]["url"],
            has_pet: oldPetData[guild][user]["has_pet"],
            has_been_pet: oldPetData[guild][user]["has_been_pet"],
          });
        }
      }
      const botRead = await fs.readFile("data/bot_settings.json", "utf-8");
      const oldBotData = JSON.parse(botRead);
      for (const guild in oldBotData) {
        await botData.create({
          guild_id: guild,
          default_pet_image: oldBotData[guild]["default_pet"],
          log_channel: oldBotData[guild]["log_channel"],
          nickname: oldBotData[guild]["nickname"],
        });
      }
      console.log("Migration Complete");
    } catch (error) {
      console.error(`Something went wrong while migrating the data. ${error}`);
    }
  },
};
