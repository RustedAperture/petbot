import { and, eq, inArray, not } from "drizzle-orm";
import { drizzleDb } from "../../db/connector.js";
import { actionData } from "../../db/schema.js";
import { ACTIONS, type ActionType } from "../../types/constants.js";
import { listCustomActionsForOwners, type CustomAction } from "./store.js";

export type ActionContext = {
  guildId: string | null;
  locationId: string;
  authorId: string;
  targetId?: string | null;
  isRestricted: boolean;
};

export type ResolvedAction = {
  name: string;
  phrase: string;
  isBuiltIn: boolean;
  sources: Array<"builtin" | "guild" | "user">;
  imageSource: "author" | "target" | "custom";
  definitionImages: { guild?: string; target?: string; author?: string };
  personalOwnerIds: string[];
  builtInDefaultImage?: string;
};

const BUILT_IN_NAMES = Object.keys(ACTIONS) as ActionType[];

export function resolveBuiltIn(name: ActionType): ResolvedAction {
  const config = ACTIONS[name];
  return {
    name,
    phrase: config.past,
    isBuiltIn: true,
    sources: ["builtin"],
    imageSource: config.imageSource,
    definitionImages: {},
    personalOwnerIds: [],
    builtInDefaultImage: config.defaultImage,
  };
}

function isBuiltInName(name: string): name is ActionType {
  return Object.hasOwn(ACTIONS, name);
}

function mergeDefinitions(
  name: string,
  defs: CustomAction[],
  ctx: ActionContext,
): ResolvedAction {
  const guild = defs.find((d) => d.scope === "guild");
  const target = defs.find(
    (d) => d.scope === "user" && d.ownerId === ctx.targetId,
  );
  const author = defs.find(
    (d) => d.scope === "user" && d.ownerId === ctx.authorId,
  );
  const winner = (guild ?? target ?? author) as CustomAction;

  const definitionImages: ResolvedAction["definitionImages"] = {};
  if (guild?.image) {
    definitionImages.guild = guild.image;
  }
  if (target?.image) {
    definitionImages.target = target.image;
  }
  if (author?.image) {
    definitionImages.author = author.image;
  }

  return {
    name,
    phrase: winner.phrase,
    isBuiltIn: false,
    sources: [...(guild ? ["guild" as const] : []), ...(target || author ? ["user" as const] : [])],
    imageSource: "custom",
    definitionImages,
    personalOwnerIds: defs.filter((d) => d.scope === "user").map((d) => d.ownerId),
  };
}

async function loadCustomActions(ctx: ActionContext): Promise<CustomAction[]> {
  const userIds = ctx.isRestricted
    ? []
    : [ctx.authorId, ...(ctx.targetId ? [ctx.targetId] : [])];
  return listCustomActionsForOwners(ctx.guildId, userIds);
}

function groupByName(defs: CustomAction[]): Map<string, CustomAction[]> {
  const byName = new Map<string, CustomAction[]>();
  for (const def of defs) {
    byName.set(def.name, [...(byName.get(def.name) ?? []), def]);
  }
  return byName;
}

export async function resolveAvailableActions(
  ctx: ActionContext,
): Promise<ResolvedAction[]> {
  const byName = groupByName(await loadCustomActions(ctx));
  const custom = [...byName.keys()]
    .sort()
    .map((name) => mergeDefinitions(name, byName.get(name) ?? [], ctx));
  return [...BUILT_IN_NAMES.map(resolveBuiltIn), ...custom];
}

export async function resolveAction(
  name: string,
  ctx: ActionContext,
): Promise<ResolvedAction | null> {
  if (isBuiltInName(name)) {
    return resolveBuiltIn(name);
  }
  const defs = (await loadCustomActions(ctx)).filter((d) => d.name === name);
  return defs.length > 0 ? mergeDefinitions(name, defs, ctx) : null;
}

/** Distinct custom action names a user has recorded rows for, sorted; optionally only at one location. */
export async function listCustomNamesWithRows(
  userId: string,
  locationId?: string,
): Promise<string[]> {
  const rows = await drizzleDb
    .selectDistinct({ actionType: actionData.actionType })
    .from(actionData)
    .where(
      and(
        eq(actionData.userId, userId),
        ...(locationId ? [eq(actionData.locationId, locationId)] : []),
        not(inArray(actionData.actionType, BUILT_IN_NAMES)),
      ),
    );
  return rows.map((r) => r.actionType).sort();
}

export async function listSettableActionNames(
  ctx: ActionContext,
): Promise<string[]> {
  const available = (await resolveAvailableActions(ctx)).map((a) => a.name);
  const known = new Set(available);
  const extra = (await listCustomNamesWithRows(ctx.authorId)).filter(
    (name) => !known.has(name),
  );
  return [...available, ...extra];
}

function pickRandom(images: string[]): string {
  return images[Math.floor(Math.random() * images.length)];
}

/** Target images, then author images, then definition images; restricted contexts use the guild definition only. */
export function pickCustomActionImage(
  action: ResolvedAction,
  targetImages: string[],
  authorImages: string[],
  isRestricted: boolean,
): string | null {
  const { guild, target, author } = action.definitionImages;
  if (isRestricted) {
    return guild ?? null;
  }
  if (targetImages.length > 0) {
    return pickRandom(targetImages);
  }
  if (authorImages.length > 0) {
    return pickRandom(authorImages);
  }
  return guild ?? target ?? author ?? null;
}
