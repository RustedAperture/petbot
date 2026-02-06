import { GuildMember, TextDisplayBuilder, User } from "discord.js";
import { ContainerBuilder } from "discord.js";
import { checkUser } from "./check_user.js";
import { ActionData } from "./db.js";
import { ActionUser } from "../types/user.js";
import { buildActionReply } from "../components/buildActionReply.js";
import { buildStatsReply } from "../components/buildStatsReply.js";
import { randomImage } from "./helper.js";
import { ACTIONS, ActionType as ActionKind } from "../types/constants.js";

export async function performAction(
  actionKind: ActionKind,
  target: User | GuildMember,
  author: User | GuildMember,
  guild: string,
): Promise<ContainerBuilder> {
  await checkUser(actionKind, target, guild);
  await checkUser(actionKind, author, guild);

  const targetRow = await ActionData.findOne({
    where: { user_id: target.id, location_id: guild, action_type: actionKind },
  });
  const authorRow = await ActionData.findOne({
    where: { user_id: author.id, location_id: guild, action_type: actionKind },
  });

  const imageSource = ACTIONS[actionKind].imageSource;
  const imageRow = imageSource === "author" ? authorRow : targetRow;

  const image = randomImage(imageRow as ActionUser);

  await targetRow!.increment("has_received");
  await authorRow!.increment("has_performed");

  return buildActionReply(
    target,
    author,
    guild,
    actionKind,
    image,
    targetRow!.get("has_received"),
  );
}

export async function getActionStatsContainer(
  actionKind: ActionKind,
  target: User | GuildMember,
  guild: string,
): Promise<ContainerBuilder> {
  const row = await ActionData.findOne({
    where: { user_id: target.id, location_id: guild, action_type: actionKind },
  });

  if (!row) {
    const targetText = new TextDisplayBuilder().setContent(
      [`The user has no ${actionKind} data`].join("\n"),
    );
    return new ContainerBuilder().addTextDisplayComponents(targetText);
  }

  const totalHasReceived = await ActionData.sum("has_received", {
    where: { user_id: target.id, action_type: actionKind },
  });

  const images = row.get("images");

  return buildStatsReply(row, images, target, actionKind, totalHasReceived);
}
