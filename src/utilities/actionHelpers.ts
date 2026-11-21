import { GuildMember, TextDisplayBuilder, User } from "discord.js";
import { ContainerBuilder } from "discord.js";
import { checkUser } from "./check_user.js";
import { drizzleDb } from "../db/connector.js";
import { actionData, botData } from "../db/schema.js";
import { sql, eq, and } from "drizzle-orm";
import { ActionUser } from "../types/user.js";
import { buildActionReply } from "../components/buildActionReply.js";
import { buildStatsReply } from "../components/buildStatsReply.js";
import { randomImage } from "./helper.js";
import logger from "../logger.js";
import { recordActionEvent } from "./actionEvents.js";
import {
  pickCustomActionImage,
  type ResolvedAction,
} from "./customActions/resolver.js";

// Slots cleared in the middle of a row are stored as null.
function presentImages(images: unknown): string[] {
  return Array.isArray(images) ? images.filter(Boolean) : [];
}

export async function performAction(
  action: ResolvedAction,
  target: User | GuildMember,
  author: User | GuildMember,
  guild: string,
  options?: { skipChecks?: boolean; isRestricted?: boolean },
): Promise<ContainerBuilder> {
  const actionKind = action.name;
  if (!options?.skipChecks) {
    await checkUser(actionKind, target, guild);
    await checkUser(actionKind, author, guild);
  }

  const [tRows, aRows, gsRows] = await Promise.all([
    drizzleDb
      .select()
      .from(actionData)
      .where(
        and(
          eq(actionData.userId, target.id),
          eq(actionData.locationId, guild),
          eq(actionData.actionType, actionKind),
        ),
      )
      .limit(1),
    drizzleDb
      .select()
      .from(actionData)
      .where(
        and(
          eq(actionData.userId, author.id),
          eq(actionData.locationId, guild),
          eq(actionData.actionType, actionKind),
        ),
      )
      .limit(1),
    drizzleDb.select().from(botData).where(eq(botData.guildId, guild)).limit(1),
  ]);
  const targetRow = tRows?.[0] ?? null;
  const authorRow = aRows?.[0] ?? null;
  const guildSettings = gsRows?.[0] ?? null;

  const imageRow = action.imageSource === "author" ? authorRow : targetRow;
  const isRestricted =
    options?.isRestricted ?? Boolean(guildSettings?.restricted);

  let images: string[];
  if (action.isBuiltIn) {
    const defaultImagesRaw = guildSettings?.defaultImages;
    const guildDefaultImage =
      defaultImagesRaw && typeof defaultImagesRaw === "object"
        ? (defaultImagesRaw as Record<string, string>)[actionKind]
        : undefined;
    const defaultImage = guildDefaultImage ?? action.builtInDefaultImage!;

    const rowImages = (imageRow?.images as string[]) ?? [];
    if (isRestricted) {
      images = [defaultImage];
    } else if (rowImages.length) {
      images = rowImages;
    } else {
      images = [defaultImage];
    }
  } else {
    const picked = pickCustomActionImage(
      action,
      presentImages(targetRow?.images),
      presentImages(authorRow?.images),
      isRestricted,
    );
    images = picked ? [picked] : [];
  }

  const normalizeDate = (value: unknown): string => {
    if (typeof value === "string") {
      return value;
    }
    if (value) {
      return String(value);
    }
    return new Date().toISOString();
  };

  let imageUser: ActionUser;
  if (imageRow) {
    imageUser = {
      id: imageRow.id,
      userId: imageRow.userId,
      locationId: imageRow.locationId ?? null,
      actionType: imageRow.actionType,
      hasPerformed: (imageRow.hasPerformed ?? 0) as number,
      hasReceived: (imageRow.hasReceived ?? 0) as number,
      images,
      createdAt: normalizeDate(imageRow.createdAt),
      updatedAt: normalizeDate(imageRow.updatedAt),
    };
  } else {
    imageUser = {
      id: 0,
      userId: "",
      locationId: null,
      actionType: actionKind,
      hasPerformed: 0,
      hasReceived: 0,
      images,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  // Custom actions have no built-in placeholder, so the reply omits the image.
  const image: string | null = randomImage(imageUser) ?? null;

  await Promise.all([
    drizzleDb
      .update(actionData)
      .set({
        hasReceived: sql`${actionData.hasReceived} + 1`,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(actionData.id, targetRow!.id)),
    drizzleDb
      .update(actionData)
      .set({
        hasPerformed: sql`${actionData.hasPerformed} + 1`,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(actionData.id, authorRow!.id)),
  ]);

  // Not awaited: a slow feed write must not delay the Discord reply.
  void recordActionEvent({
    actionType: actionKind,
    performerId: author.id,
    targetId: target.id,
    locationId: guild,
    ...(action.isBuiltIn
      ? {}
      : {
        phrase: action.phrase,
        phraseSource: action.sources.includes("guild") ? "guild" : "user",
      }),
  }).catch((error) => {
    logger.error({ err: error }, "Failed to record action event");
  });

  const refreshed: any[] = await drizzleDb
    .select()
    .from(actionData)
    .where(eq(actionData.id, targetRow!.id))
    .limit(1);
  const refreshedRow = refreshed[0];

  return buildActionReply(
    target,
    author,
    guild,
    action,
    image,
    refreshedRow.hasReceived,
  );
}

export async function getActionStatsContainer(
  action: ResolvedAction,
  target: User | GuildMember,
  guild: string,
): Promise<ContainerBuilder> {
  const actionKind = action.name;
  const rows: any[] = await drizzleDb
    .select()
    .from(actionData)
    .where(
      and(
        eq(actionData.userId, target.id),
        eq(actionData.locationId, guild),
        eq(actionData.actionType, actionKind),
      ),
    )
    .limit(1);
  const row: any = rows?.[0] ?? null;

  if (!row) {
    const targetText = new TextDisplayBuilder().setContent(
      [`The user has no ${actionKind} data`].join("\n"),
    );
    return new ContainerBuilder().addTextDisplayComponents(targetText);
  }

  const r: any = await drizzleDb
    .select({ s: sql`SUM(${actionData.hasReceived})` })
    .from(actionData)
    .where(
      and(
        eq(actionData.userId, target.id),
        eq(actionData.actionType, actionKind),
      ),
    );
  const totalHasReceived: number = Number(r?.[0]?.s ?? 0);

  const images: string[] = (row.images as string[]) ?? [];

  return buildStatsReply(row, images, target, action, totalHasReceived);
}
