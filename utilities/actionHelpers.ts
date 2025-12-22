import type { GuildMember, User } from "discord.js";
import {
  ContainerBuilder,
  MediaGalleryBuilder,
  SectionBuilder,
  TextDisplayBuilder,
  ThumbnailBuilder,
} from "discord.js";
import { checkUserBite, checkUserPet } from "./check_user.js";
import { BiteData, PetData } from "./db.js";
import { hexToRGBTuple, randomImage } from "./helper.js";
import { BiteUser, PetUser } from "../types/user.js";
import { buildActionReply } from "../components/buildActionReply.js";

async function performBite(
  target: User | GuildMember,
  author: User | GuildMember,
  guild: string,
): Promise<ContainerBuilder> {
  await checkUserBite(target, guild);
  await checkUserBite(author, guild);

  const biteTarget = await BiteData.findOne({
    where: { user_id: target.id, guild_id: guild },
  });
  const biteAuthor = await BiteData.findOne({
    where: { user_id: author.id, guild_id: guild },
  });

  const image = randomImage(biteAuthor as BiteUser);

  await biteTarget!.increment("has_been_bitten");
  await biteAuthor!.increment("has_bitten");

  return buildActionReply(
    target,
    author,
    guild,
    "bitten",
    image,
    biteTarget!.get("has_been_bitten"),
  );
}

async function performPet(
  target: User | GuildMember,
  author: User | GuildMember,
  guild: string,
): Promise<ContainerBuilder> {
  await checkUserPet(target, guild);
  await checkUserPet(author, guild);

  const petTarget = await PetData.findOne({
    where: { user_id: target.id, guild_id: guild },
  });
  const petAuthor = await PetData.findOne({
    where: { user_id: author.id, guild_id: guild },
  });

  const image = randomImage(petTarget as PetUser);

  await petTarget!.increment("has_been_pet");
  await petAuthor!.increment("has_pet");

  return buildActionReply(
    target,
    author,
    guild,
    "pet",
    image,
    petTarget!.get("has_been_pet"),
  );
}

async function getStatsContainer(
  target: User | GuildMember,
  guild: string,
  inServer: boolean,
): Promise<ContainerBuilder | { type: string; content: string }> {
  const bite = await BiteData.findOne({
    where: { user_id: target.id, guild_id: guild },
  });

  const totalHasBeenBitten = await BiteData.sum("has_been_bitten", {
    where: { user_id: target.id },
  });

  const targetName = inServer
    ? (target as GuildMember).displayName
    : (target as User).globalName;
  const targetColor = inServer
    ? hexToRGBTuple((target as GuildMember).displayHexColor)
    : (target as User).accentColor;

  const biteStatsContainer = new ContainerBuilder().setAccentColor(
    targetColor!,
  );

  if (!bite) {
    return { type: "noData", content: "The user has no bite data" };
  }

  const targetSection = new SectionBuilder();

  const targetText = new TextDisplayBuilder().setContent(
    [
      `# ${targetName} bite stats`,
      `**Times bitten here**: ${bite.get("has_been_bitten")}x`,
      `**Total times bitten**: ${totalHasBeenBitten}x`,
      `**Used bite**: ${bite.get("has_bitten")}x`,
    ].join("\n"),
  );

  const targetThumbnail = new ThumbnailBuilder().setURL(
    target.displayAvatarURL(),
  );

  targetSection.addTextDisplayComponents(targetText);
  targetSection.setThumbnailAccessory(targetThumbnail);

  biteStatsContainer.addSectionComponents(targetSection);

  const biteImages = bite.get("images");
  const biteGallery = new MediaGalleryBuilder();

  for (let i = 0; i < biteImages.length; i++) {
    biteGallery.addItems([
      {
        description: `Bite Image ${i + 1}`,
        media: { url: biteImages[i] },
      },
    ]);
  }

  biteStatsContainer.addMediaGalleryComponents(biteGallery);

  return biteStatsContainer;
}

async function getPetStatsContainer(
  target: User | GuildMember,
  guild: string,
  inServer: boolean,
): Promise<ContainerBuilder | { type: string; content: string }> {
  const pet = await PetData.findOne({
    where: { user_id: target.id, guild_id: guild },
  });

  const totalHasBeenPet = await PetData.sum("has_been_pet", {
    where: { user_id: target.id },
  });

  const targetName = inServer
    ? (target as GuildMember).displayName
    : (target as User).globalName;
  const targetColor = inServer
    ? hexToRGBTuple((target as GuildMember).displayHexColor)
    : (target as User).accentColor;

  const petStatsContainer = new ContainerBuilder().setAccentColor(targetColor!);

  if (!pet) {
    return { type: "noData", content: "The user has no pet data" };
  }

  const targetSection = new SectionBuilder();

  const targetText = new TextDisplayBuilder().setContent(
    [
      `# ${targetName} pet stats`,
      `**Times pet here**: ${pet.get("has_been_pet")}x`,
      `**Total times pet**: ${totalHasBeenPet}x`,
      `**Used pet**: ${pet.get("has_pet")}x`,
    ].join("\n"),
  );

  const targetThumbnail = new ThumbnailBuilder().setURL(
    target.displayAvatarURL(),
  );

  targetSection.addTextDisplayComponents(targetText);
  targetSection.setThumbnailAccessory(targetThumbnail);

  petStatsContainer.addSectionComponents(targetSection);

  const petImages = pet.get("images");
  const petGallery = new MediaGalleryBuilder();

  for (let i = 0; i < petImages.length; i++) {
    petGallery.addItems([
      {
        description: `Pet Image ${i + 1}`,
        media: { url: petImages[i] },
      },
    ]);
  }

  petStatsContainer.addMediaGalleryComponents(petGallery);

  return petStatsContainer;
}

export { performBite, performPet, getStatsContainer, getPetStatsContainer };
