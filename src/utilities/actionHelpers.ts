import { GuildMember, TextDisplayBuilder, User } from "discord.js";
import { ContainerBuilder } from "discord.js";
import { checkUser } from "./check_user.js";
import { drizzleDb } from "../db/connector.js";
import { actionData } from "../db/schema.js";
import { sql, eq, and } from "drizzle-orm";
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
  options?: { skipChecks?: boolean },
): Promise<ContainerBuilder> {
  if (!options?.skipChecks) {
    await checkUser(actionKind, target, guild);
    await checkUser(actionKind, author, guild);
  }

  const [tRows, aRows] = await Promise.all([
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
  ]);
  const targetRow = tRows?.[0] ?? null;
  const authorRow = aRows?.[0] ?? null;

  const imageSource = ACTIONS[actionKind].imageSource;
  const imageRow = imageSource === "author" ? authorRow : targetRow;

  const imageUser: ActionUser = imageRow
    ? {
      id: imageRow.id,
      userId: imageRow.userId,
      locationId: imageRow.locationId ?? null,
      actionType: imageRow.actionType,
      hasPerformed: (imageRow.hasPerformed ?? 0) as number,
      hasReceived: (imageRow.hasReceived ?? 0) as number,
      images: (imageRow.images as string[]) ?? [
        ACTIONS[actionKind].defaultImage,
      ],
      createdAt:
          typeof imageRow.createdAt === "string"
            ? imageRow.createdAt
            : imageRow.createdAt
              ? String(imageRow.createdAt)
              : new Date().toISOString(),
      updatedAt:
          typeof imageRow.updatedAt === "string"
            ? imageRow.updatedAt
            : imageRow.updatedAt
              ? String(imageRow.updatedAt)
              : new Date().toISOString(),
    }
    : {
      id: 0,
      userId: "",
      locationId: null,
      actionType: actionKind,
      hasPerformed: 0,
      hasReceived: 0,
      images: [ACTIONS[actionKind].defaultImage],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

  const image = randomImage(imageUser);

  await Promise.all([
    drizzleDb
      .update(actionData)
      .set({ hasReceived: sql`${actionData.hasReceived} + 1` })
      .where(eq(actionData.id, targetRow!.id)),
    drizzleDb
      .update(actionData)
      .set({ hasPerformed: sql`${actionData.hasPerformed} + 1` })
      .where(eq(actionData.id, authorRow!.id)),
  ]);

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
    actionKind,
    image,
    refreshedRow.hasReceived,
  );
}

export async function getActionStatsContainer(
  actionKind: ActionKind,
  target: User | GuildMember,
  guild: string,
): Promise<ContainerBuilder> {
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

  return buildStatsReply(row, images, target, actionKind, totalHasReceived);
}
