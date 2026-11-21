import {
  ContainerBuilder,
  type GuildMember,
  MediaGalleryBuilder,
  TextDisplayBuilder,
  type User,
} from "discord.js";
import { getAccentColor, getName } from "../utilities/helper.js";
import logger from "../logger.js";
import type { ResolvedAction } from "../utilities/customActions/resolver.js";

export function buildActionReply(
  target: User | GuildMember,
  author: User | GuildMember,
  guild: string,
  action: ResolvedAction,
  image: string | null,
  count: number,
) {
  const past = action.phrase;
  const targetId = target.id;
  const container = new ContainerBuilder();
  const targetText = new TextDisplayBuilder();
  const gallery = new MediaGalleryBuilder();
  const countText = new TextDisplayBuilder();

  const targetName = getName(target);
  const authorName = getName(author);
  const accentColour = getAccentColor(target);

  targetText.setContent(`# <@${targetId}> has been ${past}!`);

  countText.setContent(
    `-# ${targetName} has been ${past} ${count} times | Command ran by ${authorName}`,
  );

  if (image) {
    gallery.addItems([
      {
        description: `${targetName} being ${past}`,
        media: { url: image },
      },
    ]);
  }

  container.setAccentColor(accentColour);
  if (image) {
    container.addMediaGalleryComponents(gallery);
  }
  container.addTextDisplayComponents(targetText);
  container.addTextDisplayComponents(countText);

  logger.debug(
    {
      Context: `${guild}`,
      Trigger: authorName,
      Target: targetName,
    },
    `A user has been ${past}`,
  );

  return container;
}
