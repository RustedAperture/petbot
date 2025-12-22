import {
  ContainerBuilder,
  type GuildMember,
  MediaGalleryBuilder,
  TextDisplayBuilder,
  type User,
} from "discord.js";
import { getAccentColor, getName } from "../utilities/helper.js";
import logger from "../logger.js";

export function buildActionReply(
  target: User | GuildMember,
  author: User | GuildMember,
  guild: string,
  action: string,
  image: string,
  count: number,
) {
  const targetId = target.id;
  const container = new ContainerBuilder();
  const targetText = new TextDisplayBuilder();
  const gallery = new MediaGalleryBuilder();
  const countText = new TextDisplayBuilder();

  const targetName = getName(target);
  const authorName = getName(author);
  const accentColour = getAccentColor(target);

  targetText.setContent(`# <@${targetId}> has been ${action}!`);

  countText.setContent(
    `-# ${targetName} has been ${action} ${count} times | Command ran by ${authorName}`,
  );

  gallery.addItems([
    {
      description: `${targetName} being ${action}`,
      media: { url: image },
    },
  ]);

  container.setAccentColor(accentColour);
  container.addMediaGalleryComponents(gallery);
  container.addTextDisplayComponents(targetText);
  container.addTextDisplayComponents(countText);

  logger.debug(
    {
      Context: `${guild}`,
      Trigger: authorName,
      Target: targetName,
    },
    `A user has been ${action}`,
  );

  return container;
}
