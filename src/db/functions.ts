import { drizzleDb } from "./connector.js";
import { botData } from "./schema.js";
import { eq } from "drizzle-orm";
import type { GuildSettings } from "../types/guild.js";

export const Op = {
  not: Symbol("not"),
  gt: Symbol("gt"),
};

export type BotDataUpdate = Partial<
  Pick<
    GuildSettings,
    "logChannel" | "nickname" | "sleepImage" | "defaultImages" | "restricted"
  >
>;

function normalizeDefaultImages(value: unknown): Record<string, string> | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return normalizeDefaultImages(parsed);
    } catch {
      return null;
    }
  }

  if (typeof value === "object" && !Array.isArray(value)) {
    const result: Record<string, string> = {};
    for (const [key, val] of Object.entries(value)) {
      if (typeof val === "string") {
        result[key] = val;
      }
    }
    return result;
  }

  return null;
}

function serializeDefaultImages(value: unknown): Record<string, string> | null {
  const normalized = normalizeDefaultImages(value);
  if (normalized === null) {
    return null;
  }
  return normalized;
}

export async function getBotData(
  guildId: string,
): Promise<GuildSettings | null> {
  const rows = await drizzleDb
    .select()
    .from(botData)
    .where(eq(botData.guildId, guildId))
    .limit(1);

  const row = rows?.[0];
  if (!row) {
    return null;
  }

  const normalizedDefaultImages = normalizeDefaultImages(row.defaultImages);

  return {
    ...row,
    defaultImages: normalizedDefaultImages,
  } as GuildSettings;
}

export async function upsertBotData(
  guildId: string,
  data: BotDataUpdate,
): Promise<GuildSettings> {
  const existing = await getBotData(guildId);

  const now = new Date().toISOString();
  const sanitized: Partial<GuildSettings> = {
    ...data,
    defaultImages: data.defaultImages
      ? serializeDefaultImages(data.defaultImages)
      : (existing?.defaultImages ?? null),
    updatedAt: now,
  };

  if (existing) {
    await drizzleDb
      .update(botData)
      .set(sanitized)
      .where(eq(botData.guildId, guildId));

    return {
      ...existing,
      ...sanitized,
      defaultImages: sanitized.defaultImages ?? null,
    } as GuildSettings;
  }

  const toInsert: Partial<GuildSettings> = {
    guildId,
    ...sanitized,
    createdAt: now,
  };

  await drizzleDb.insert(botData).values(toInsert as any);

  return {
    id: -1,
    guildId,
    logChannel: toInsert.logChannel ?? "",
    nickname: toInsert.nickname ?? "",
    sleepImage: toInsert.sleepImage ?? "",
    defaultImages: toInsert.defaultImages ?? null,
    restricted: Boolean(toInsert.restricted ?? false),
    createdAt: now,
    updatedAt: now,
  } as GuildSettings;
}
