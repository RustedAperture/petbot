import {
  ContainerBuilder,
  type GuildMember,
  MediaGalleryBuilder,
  SectionBuilder,
  TextDisplayBuilder,
  ThumbnailBuilder,
  type User,
} from "discord.js";
import { getAccentColor, getName } from "../utilities/helper.js";
import { ACTIONS, ActionType } from "../types/constants.js";

export function buildStatsReply(
  data: any,
  images: string[],
  target: User | GuildMember,
  action: ActionType,
  totalCount: number,
) {
  const actionObj = ACTIONS[action];
  const targetName = getName(target);
  const accentColour = getAccentColor(target);

  const statsContainer = new ContainerBuilder();

  statsContainer.setAccentColor(accentColour);

  const targetSection = new SectionBuilder();
  const targetText = new TextDisplayBuilder();

  targetText.setContent(
    [
      `# ${targetName} ${actionObj.noun} stats`,
      `**Times ${actionObj.past} here**: ${data.get(`has_received`)}x`,
      `**Total times ${actionObj.past}**: ${totalCount}x`,
      `**Used ${actionObj.noun}**: ${data.get(`has_performed`)}x`,
    ].join("\n"),
  );

  const gallery = new MediaGalleryBuilder();

  for (let i = 0; i < images.length; i++) {
    gallery.addItems([
      {
        description: `${actionObj.noun} Image ${i + 1}`,
        media: { url: images[i] },
      },
    ]);
  }

  statsContainer.addMediaGalleryComponents(gallery);

  const targetThumbnail = new ThumbnailBuilder().setURL(
    target.displayAvatarURL(),
  );

  targetSection.addTextDisplayComponents(targetText);
  targetSection.setThumbnailAccessory(targetThumbnail);

  statsContainer.addSectionComponents(targetSection);

  return statsContainer;
}
