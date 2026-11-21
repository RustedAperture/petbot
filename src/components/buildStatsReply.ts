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
import type { ResolvedAction } from "../utilities/customActions/resolver.js";

export function buildStatsReply(
  data: any,
  images: string[],
  target: User | GuildMember,
  action: ResolvedAction,
  totalCount: number,
) {
  const noun = action.name;
  const past = action.phrase;
  const targetName = getName(target);
  const accentColour = getAccentColor(target);

  const statsContainer = new ContainerBuilder();

  statsContainer.setAccentColor(accentColour);

  const targetSection = new SectionBuilder();
  const targetText = new TextDisplayBuilder();

  targetText.setContent(
    [
      `# ${targetName} ${noun} stats`,
      `**Times ${past} here**: ${data.hasReceived}x`,
      `**Total times ${past}**: ${totalCount}x`,
      `**Used ${noun}**: ${data.hasPerformed}x`,
    ].join("\n"),
  );

  const gallery = new MediaGalleryBuilder();

  for (let i = 0; i < images.length; i++) {
    gallery.addItems([
      {
        description: `${noun} Image ${i + 1}`,
        media: { url: images[i] },
      },
    ]);
  }

  if (images.length > 0 || action.isBuiltIn) {
    statsContainer.addMediaGalleryComponents(gallery);
  }

  const targetThumbnail = new ThumbnailBuilder().setURL(
    target.displayAvatarURL(),
  );

  targetSection.addTextDisplayComponents(targetText);
  targetSection.setThumbnailAccessory(targetThumbnail);

  statsContainer.addSectionComponents(targetSection);

  return statsContainer;
}
