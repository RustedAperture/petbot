const botData = require("../data/bot_settings.json");
const fs = require("fs").promises;

exports.checkUser = async (user, guild) => {
	const petRead = await fs.readFile("data/pet_data.json", "utf-8");
	const petData = JSON.parse(petRead);

	// Check if the user ID exists
	if (!petData[guild].hasOwnProperty(user.id)) {
		petData[guild][user.id] = {
			url: botData[guild]["default_pet"],
			has_pet: 0,
			has_been_pet: 0,
		};
		await fs.writeFile(
			"data/pet_data.json",
			JSON.stringify(petData, null, 2),
			"utf-8"
		);
	}
};
