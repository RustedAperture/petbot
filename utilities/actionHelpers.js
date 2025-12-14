const {
  ContainerBuilder,
  TextDisplayBuilder,
  MediaGalleryBuilder,
} = require("discord.js");
const { checkUserBite } = require("./check_user");
const { checkUserPet } = require("./check_user");
const { biteData, petData } = require("./db");
const { hexToRGBTuple, randomImage } = require("./helper");

// Performs the bite action on a single target and returns a container.
// Used by both slash and context menu bite commands.
async function performBite(target, author, guild, inServer, logger = null) {
  await checkUserBite(target, guild);
  await checkUserBite(author, guild);

  const biteTarget = await biteData.findOne({
    where: { user_id: target.id, guild_id: guild },
  });
  const biteAuthor = await biteData.findOne({
    where: { user_id: author.id, guild_id: guild },
  });

  const image = randomImage(biteAuthor);

  await biteTarget.increment("has_been_bitten");
  await biteAuthor.increment("has_bitten");

  const targetName = inServer ? target.displayName : target.globalName;
  const targetColor = inServer
    ? hexToRGBTuple(target.displayHexColor)
    : target.accentColor;

  const biteContainer = new ContainerBuilder().setAccentColor(targetColor);

  const targetText = new TextDisplayBuilder().setContent(
    `# <@${target.id}> has been bitten!`,
  );

  const biteGallery = new MediaGalleryBuilder().addItems([
    {
      description: "Bite Image",
      media: { url: image },
    },
  ]);

  biteContainer.addMediaGalleryComponents(biteGallery);
  biteContainer.addTextDisplayComponents(targetText);

  const countText = new TextDisplayBuilder().setContent(
    `-# ${targetName} has been bitten ${biteTarget.get("has_been_bitten")} times | Command ran by ${author.displayName}`,
  );

  biteContainer.addTextDisplayComponents(countText);

  // Add logging if provided (e.g., for context menus or slash).
  if (logger) {
    logger.debug(
      {
        Context: `${guild}`, // Simplified; expand if needed
        Trigger: author.displayName,
        Target: targetName,
      },
      "A user has been bitten",
    );
  }

  return biteContainer;
}

// Performs the pet action on a single target and returns a container.
// Used by both slash and context menu pet commands (if you add a context menu later).
async function performPet(target, author, guild, inServer, logger = null) {
  await checkUserPet(target, guild);
  await checkUserPet(author, guild);

  const petTarget = await petData.findOne({
    where: { user_id: target.id, guild_id: guild },
  });
  const petAuthor = await petData.findOne({
    where: { user_id: author.id, guild_id: guild },
  });

  const image = randomImage(petTarget);

  await petTarget.increment("has_been_pet");
  await petAuthor.increment("has_pet");

  const targetName = inServer ? target.displayName : target.globalName;
  const targetColor = inServer
    ? hexToRGBTuple(target.displayHexColor)
    : target.accentColor;

  const petContainer = new ContainerBuilder().setAccentColor(targetColor);

  const targetText = new TextDisplayBuilder().setContent(
    `# <@${target.id}> has been pet!`,
  );

  const petGallery = new MediaGalleryBuilder().addItems([
    {
      description: "Pet Image",
      media: { url: image },
    },
  ]);

  petContainer.addMediaGalleryComponents(petGallery);
  petContainer.addTextDisplayComponents(targetText);

  const countText = new TextDisplayBuilder().setContent(
    `-# ${targetName} has been pet ${petTarget.get("has_been_pet")} times | Command ran by ${author.displayName}`,
  );

  petContainer.addTextDisplayComponents(countText);

  // Add logging if provided.
  if (logger) {
    logger.debug(
      {
        Context: `${guild}`,
        Trigger: author.displayName,
        Target: targetName,
      },
      "A user has been pet",
    );
  }

  return petContainer;
}

// Builds and returns a stats container for a target.
// Used by both slash and context menu stats commands.
async function getStatsContainer(target, guild, inServer) {
  const bite = await biteData.findOne({
    where: { user_id: target.id, guild_id: guild },
  });

  const totalHasBeenBitten = await biteData.sum("has_been_bitten", {
    where: { user_id: target.id },
  });

  const targetName = inServer ? target.displayName : target.globalName;
  const targetColor = inServer
    ? hexToRGBTuple(target.displayHexColor)
    : target.accentColor;

  const biteStatsContainer = new ContainerBuilder().setAccentColor(targetColor);

  if (!bite) {
    return { type: "noData", content: "The user has no bite data" };
  }

  const { ThumbnailBuilder, SectionBuilder } = require("discord.js");

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

// Builds and returns a stats container for a pet target.
// Used by both slash and context menu pet stats commands.
async function getPetStatsContainer(target, guild, inServer) {
  const pet = await petData.findOne({
    where: { user_id: target.id, guild_id: guild },
  });

  const totalHasBeenPet = await petData.sum("has_been_pet", {
    where: { user_id: target.id },
  });

  const targetName = inServer ? target.displayName : target.globalName;
  const targetColor = inServer
    ? hexToRGBTuple(target.displayHexColor)
    : target.accentColor;

  const petStatsContainer = new ContainerBuilder().setAccentColor(targetColor);

  if (!pet) {
    return { type: "noData", content: "The user has no pet data" };
  }

  const { ThumbnailBuilder, SectionBuilder } = require("discord.js");

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

module.exports = {
  performBite,
  performPet,
  getStatsContainer,
  getPetStatsContainer,
};
