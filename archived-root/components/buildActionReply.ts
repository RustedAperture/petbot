export * from "../src/components/buildActionReply.js";
import { getAccentColor, getName } from "../utilities/helper.js";
import logger from "../logger.js";
import { ACTIONS, ActionType } from "../types/constants.js";

export function buildActionReply(
  target: User | GuildMember,
  author: User | GuildMember,
  guild: string,
  action: ActionType,
  image: string,
  count: number,
) {
  const actionObj = ACTIONS[action];
  const targetId = target.id;
  const container = new ContainerBuilder();
  const targetText = new TextDisplayBuilder();
  const gallery = new MediaGalleryBuilder();
  const countText = new TextDisplayBuilder();

  const targetName = getName(target);
  const authorName = getName(author);
  const accentColour = getAccentColor(target);

  targetText.setContent(`# <@${targetId}> has been ${actionObj.past}!`);

  countText.setContent(
    `-# ${targetName} has been ${actionObj.past} ${count} times | Command ran by ${authorName}`,
  );

  gallery.addItems([
    {
      description: `${targetName} being ${actionObj.past}`,
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
    `A user has been ${actionObj.past}`,
  );

  return container;
}
