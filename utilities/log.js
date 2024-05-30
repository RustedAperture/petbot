const { EmbedBuilder, ActionRow } = require("discord.js");

exports.log = async (
	title,
	desc,
	channel,
	trigger,
	image = null,
	reason = null,
	actionRow = null
) => {
	let logEmbed = new EmbedBuilder();

	if (!image) {
		logEmbed.setTitle(title).setDescription(desc);
	} else {
		logEmbed.setTitle(title).setDescription(desc).setThumbnail(image);
	}

	if (reason != null) {
		logEmbed.addFields({ name: "Reason:", value: reason });
	}

	logEmbed.addFields({ name: "Triggered By:", value: trigger });

	if (!actionRow) {
		channel.send({ embeds: [logEmbed] });
	} else {
		channel.send({ embeds: [logEmbed], components: [actionRow] });
	}
};
