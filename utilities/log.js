const { 
	EmbedBuilder, 
	ActionRow, 
	ContainerBuilder, 
	TextDisplayBuilder, 
	MediaGalleryBuilder,
	MessageFlags, 
	SectionBuilder,
	ThumbnailBuilder,
	ActionRowBuilder
} = require("discord.js");

exports.log = async (
	title,
	desc,
	channel,
	trigger,
	image = null,
	actionRow = null,
	color = null
) => {

	let embedColor = color ?? [255, 255, 255];

	const logContainer = new ContainerBuilder();

	const titleText = new TextDisplayBuilder().setContent(title)

	const descText = new TextDisplayBuilder().setContent(desc)

	logContainer.addTextDisplayComponents(titleText, descText);

	if (image != null) {
		const imageGallery = new MediaGalleryBuilder().addItems([{
			media: {
				url: image
			}
		}])
		logContainer.addMediaGalleryComponents(imageGallery);
	}

	if (actionRow != null) {
		const actionRowComponents = new ActionRowBuilder().addComponents(actionRow);
		logContainer.addActionRowComponents(actionRowComponents);
	} 

	const now = new Date();
	const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	const dateString = now.toLocaleDateString([], { month: 'long', day: 'numeric' });
	const isToday = now.toDateString() === new Date().toDateString();
	const readableTimestamp = isToday
		? `Today at ${timeString}`
		: `${dateString} at ${timeString}`;

	const footerText = new TextDisplayBuilder().setContent(`Triggered by: @${trigger.username} | ${readableTimestamp}`)

	logContainer.addTextDisplayComponents(footerText);

	logContainer.setAccentColor(embedColor);

	channel.send({ 
		components: [logContainer], 
		flags: MessageFlags.IsComponentsV2 
	});
};
