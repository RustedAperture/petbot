const { EmbedBuilder, ActionRow } = require("discord.js");

exports.log = async (
	title,
	desc,
	channel,
	trigger,
	image = null,
	actionRow = null,
	color = null
) => {
	let logEmbed = new EmbedBuilder();

	let embedColor = color ?? "Default";

	logEmbed.setColor(embedColor);

	if (!image) {
		logEmbed.setTitle(title).setDescription(desc);
	} else {
		logEmbed.setTitle(title).setDescription(desc).setThumbnail(image);
	}

	logEmbed.setFooter({
		text: `@${trigger.username}`,
		iconURL: `${trigger.avatarURL()}`,
	});

	logEmbed.setTimestamp();

	if (!actionRow) {
		channel.send({ embeds: [logEmbed] });
	} else {
		channel.send({ embeds: [logEmbed], components: [actionRow] });
	}
};
