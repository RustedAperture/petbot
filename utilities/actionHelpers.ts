import type { GuildMember, User } from "discord.js";
import { ContainerBuilder } from "discord.js";
import { checkUserBite, checkUserPet } from "./check_user.js";
import { BiteData, PetData } from "./db.js";
import { BiteUser, PetUser } from "../types/user.js";
import { buildActionReply } from "../components/buildActionReply.js";
import { buildStatsReply } from "../components/buildStatsReply.js";
import { randomImage } from "./helper.js";

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
    "bite",
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

async function getBiteStatsContainer(
  target: User | GuildMember,
  guild: string,
): Promise<ContainerBuilder> {
  const bite = await BiteData.findOne({
    where: { user_id: target.id, guild_id: guild },
  });

  const totalHasBeenBitten = await BiteData.sum("has_been_bitten", {
    where: { user_id: target.id },
  });

  const images = bite!.get("images");

  return buildStatsReply(bite, images, target, "bite", totalHasBeenBitten);
}

async function getPetStatsContainer(
  target: User | GuildMember,
  guild: string,
): Promise<ContainerBuilder> {
  const pet = await PetData.findOne({
    where: { user_id: target.id, guild_id: guild },
  });

  const images = pet!.get("images");

  const totalHasBeenPet = await PetData.sum("has_been_pet", {
    where: { user_id: target.id },
  });

  return buildStatsReply(pet, images, target, "pet", totalHasBeenPet);
}

export { performBite, performPet, getBiteStatsContainer, getPetStatsContainer };
