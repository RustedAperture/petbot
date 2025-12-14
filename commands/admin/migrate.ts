import { SlashCommandBuilder, PermissionsBitField } from "discord.js";
import { PetData, BotData } from "../../utilities/db.js";
import { emitCommand } from "../../utilities/metrics.js";
import fs from "node:fs/promises";

export const command = {
  data: new SlashCommandBuilder()
    .setName("migrate")
    .setDescription("migrate from v1 to v2")
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),
  async execute(_interaction: any) {
    emitCommand("migrate");
    try {
      const petRead = await fs.readFile("data/pet_data.json", "utf-8");
      const oldPetData = JSON.parse(petRead) as any;
      for (const guild in oldPetData) {
        for (const user in oldPetData[guild]) {
          await (PetData.create as any)({
            user_id: user,
            guild_id: guild,
            pet_img: oldPetData[guild][user]["url"],
            has_pet: oldPetData[guild][user]["has_pet"],
            has_been_pet: oldPetData[guild][user]["has_been_pet"],
          } as any);
        }
      }

      const botRead = await fs.readFile("data/bot_settings.json", "utf-8");
      const oldBotData = JSON.parse(botRead) as any;
      for (const guild in oldBotData) {
        await (BotData.create as any)({
          guild_id: guild,
          default_pet_image: oldBotData[guild]["default_pet"],
          log_channel: oldBotData[guild]["log_channel"],
          nickname: oldBotData[guild]["nickname"],
        } as any);
      }
      console.log("Migration Complete");
    } catch (error) {
      console.error(`Something went wrong while migrating the data. ${error}`);
    }
  },
};

export default command;
