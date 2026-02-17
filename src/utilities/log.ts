import {
  ContainerBuilder,
  TextDisplayBuilder,
  MediaGalleryBuilder,
  MessageFlags,
  ActionRowBuilder,
} from "discord.js";

export const log = async (
  title: string,
  desc: string,
  channel: any,
  trigger: any,
  image: string | null = null,
  actionRow: any = null,
  color: number[] | null = null,
) => {
  const embedColor = color ?? [255, 255, 255];

  const logContainer = new ContainerBuilder();

  const titleText = new TextDisplayBuilder().setContent(title);

  const descText = new TextDisplayBuilder().setContent(desc);

  logContainer.addTextDisplayComponents(titleText, descText);

  if (image != null) {
    const imageGallery = new MediaGalleryBuilder().addItems([
      {
        media: {
          url: image,
        },
      },
    ]);
    logContainer.addMediaGalleryComponents(imageGallery);
  }

  if (actionRow != null) {
    const actionRowComponents = new ActionRowBuilder().addComponents(
      actionRow as any,
    );

    logContainer.addActionRowComponents(actionRowComponents as any);
  }

  const now = new Date();
  const timeString = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const dateString = now.toLocaleDateString([], {
    month: "long",
    day: "numeric",
  });
  const isToday = now.toDateString() === new Date().toDateString();
  const readableTimestamp = isToday
    ? `Today at ${timeString}`
    : `${dateString} at ${timeString}`;

  const footerText = new TextDisplayBuilder().setContent(
    `Triggered by: @${trigger.username} | ${readableTimestamp}`,
  );

  logContainer.addTextDisplayComponents(footerText);

  logContainer.setAccentColor(embedColor as any);

  channel.send({
    components: [logContainer],
    flags: MessageFlags.IsComponentsV2,
  });
};

export default { log };
