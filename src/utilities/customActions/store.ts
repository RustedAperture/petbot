import { and, count, desc, eq, inArray, max, or, type SQL } from "drizzle-orm";
import { drizzleDb } from "../../db/connector.js";
import { customActionBans, customActions } from "../../db/schema.js";
import { emitGuildActionsChanged } from "./changeEvents.js";

export type CustomAction = typeof customActions.$inferSelect;
export type CustomActionScope = "guild" | "user";

export const CUSTOM_ACTION_LIMIT = 5;

const UNAVAILABLE_ERROR = "That action isn't available here.";

const LIMIT_ERRORS: Record<CustomActionScope, string> = {
  user: `You've reached the limit of ${CUSTOM_ACTION_LIMIT} custom actions.`,
  guild: `This server has reached the limit of ${CUSTOM_ACTION_LIMIT} custom actions.`,
};

function ownerCondition(scope: CustomActionScope, ownerId: string): SQL {
  return and(
    eq(customActions.scope, scope),
    eq(customActions.ownerId, ownerId),
  ) as SQL;
}

function actionCondition(
  scope: CustomActionScope,
  ownerId: string,
  name: string,
): SQL {
  return and(ownerCondition(scope, ownerId), eq(customActions.name, name)) as SQL;
}

export async function listCustomActions(
  scope: CustomActionScope,
  ownerId: string,
): Promise<CustomAction[]> {
  return drizzleDb
    .select()
    .from(customActions)
    .where(ownerCondition(scope, ownerId))
    .orderBy(customActions.name);
}

export async function listCustomActionsForOwners(
  guildId: string | null,
  userIds: string[],
): Promise<CustomAction[]> {
  const conditions: SQL[] = [];
  if (guildId) {
    conditions.push(ownerCondition("guild", guildId));
  }
  if (userIds.length > 0) {
    conditions.push(
      and(
        eq(customActions.scope, "user"),
        inArray(customActions.ownerId, userIds),
      ) as SQL,
    );
  }
  if (conditions.length === 0) {
    return [];
  }
  return drizzleDb
    .select()
    .from(customActions)
    .where(or(...conditions));
}

type UpsertInput = {
  scope: CustomActionScope;
  ownerId: string;
  name: string;
  phrase: string;
  image: string | null;
  createdBy: string | null;
};

export async function upsertCustomAction(
  input: UpsertInput,
): Promise<{ action: CustomAction } | { error: string }> {
  return serialised(async () => {
    const result = await upsertRow(input);
    if ("action" in result && input.scope === "guild") {
      emitGuildActionsChanged(input.ownerId);
    }
    return result;
  });
}

// Every definition mutation (upsert, remove, image, deletes) is queued
// in-process so a delete can't interleave with an upsert's read and write; no
// transaction is used because libSQL
// opens a fresh connection per transaction with no busy timeout, so an
// IMMEDIATE transaction would make concurrent built-in writes fail with
// SQLITE_BUSY. The unique (scope, owner_id, name) index still prevents duplicates.
let upsertQueue: Promise<unknown> = Promise.resolve();

function serialised<T>(task: () => Promise<T>): Promise<T> {
  const run = upsertQueue.then(task, task);
  upsertQueue = run.catch(() => undefined);
  return run;
}

async function upsertRow(input: UpsertInput) {
  const { scope, ownerId, name, phrase, image, createdBy } = input;
  const banMessage = createdBy ? await creatorBanMessage(createdBy) : null;
  if (banMessage) {
    return { error: banMessage };
  }

  const now = new Date().toISOString();
  const [existing] = await drizzleDb
    .select()
    .from(customActions)
    .where(actionCondition(scope, ownerId, name));

  if (existing) {
    const [action] = await drizzleDb
      .update(customActions)
      .set({ phrase, image, updatedAt: now })
      .where(eq(customActions.id, existing.id))
      .returning();
    return action ? { action } : { error: UNAVAILABLE_ERROR };
  }

  const owned = await drizzleDb
    .select({ id: customActions.id })
    .from(customActions)
    .where(ownerCondition(scope, ownerId));
  if (owned.length >= CUSTOM_ACTION_LIMIT) {
    return { error: LIMIT_ERRORS[scope] };
  }
  const [action] = await drizzleDb
    .insert(customActions)
    .values({
      name,
      phrase,
      scope,
      ownerId,
      image,
      createdBy,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  return { action };
}

export function removeCustomAction(
  scope: CustomActionScope,
  ownerId: string,
  name: string,
): Promise<boolean> {
  return serialised(async () => {
    const rows = await drizzleDb
      .delete(customActions)
      .where(actionCondition(scope, ownerId, name))
      .returning({ id: customActions.id });
    if (rows.length > 0 && scope === "guild") {
      emitGuildActionsChanged(ownerId);
    }
    return rows.length > 0;
  });
}

export function setCustomActionImage(
  scope: CustomActionScope,
  ownerId: string,
  name: string,
  image: string | null,
): Promise<boolean> {
  return serialised(async () => {
    const rows = await drizzleDb
      .update(customActions)
      .set({ image, updatedAt: new Date().toISOString() })
      .where(actionCondition(scope, ownerId, name))
      .returning({ id: customActions.id });
    if (rows.length > 0 && scope === "guild") {
      emitGuildActionsChanged(ownerId);
    }
    return rows.length > 0;
  });
}

export async function listAllCustomActions(filter: {
  name?: string;
  scope?: CustomActionScope;
  ownerId?: string;
}): Promise<CustomAction[]> {
  const conditions: SQL[] = [];
  if (filter.name) {
    conditions.push(eq(customActions.name, filter.name));
  }
  if (filter.scope) {
    conditions.push(eq(customActions.scope, filter.scope));
  }
  if (filter.ownerId) {
    conditions.push(eq(customActions.ownerId, filter.ownerId));
  }
  return drizzleDb
    .select()
    .from(customActions)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(customActions.id);
}

export function deleteCustomActionById(
  id: number,
): Promise<CustomAction | null> {
  return serialised(async () => {
    const [row] = await drizzleDb
      .delete(customActions)
      .where(eq(customActions.id, id))
      .returning();
    if (row?.scope === "guild") {
      emitGuildActionsChanged(row.ownerId);
    }
    return row ?? null;
  });
}

/** The phrase most actions with this name use (newest wins a tie), or null when the name is unused. */
export async function findCommonPhrase(name: string): Promise<string | null> {
  const [row] = await drizzleDb
    .select({ phrase: customActions.phrase })
    .from(customActions)
    .where(eq(customActions.name, name))
    .groupBy(customActions.phrase)
    .orderBy(desc(count()), desc(max(customActions.updatedAt)))
    .limit(1);
  return row?.phrase ?? null;
}

/** Owner moderation: changes an action's phrase and image, keeping its name and creator. */
export function updateCustomActionById(
  id: number,
  changes: { phrase: string; image: string },
): Promise<CustomAction | null> {
  return serialised(async () => {
    const [row] = await drizzleDb
      .update(customActions)
      .set({ ...changes, updatedAt: new Date().toISOString() })
      .where(eq(customActions.id, id))
      .returning();
    if (row?.scope === "guild") {
      emitGuildActionsChanged(row.ownerId);
    }
    return row ?? null;
  });
}

/** The user's ban with the owner's reason; null when not banned. */
export async function findCreatorBan(
  userId: string,
): Promise<{ reason: string | null } | null> {
  const [row] = await drizzleDb
    .select({ reason: customActionBans.reason })
    .from(customActionBans)
    .where(eq(customActionBans.userId, userId));
  return row ?? null;
}

/** The message shown to a banned creator, including the owner's reason; null when not banned. */
export async function creatorBanMessage(userId: string): Promise<string | null> {
  const row = await findCreatorBan(userId);
  if (!row) {
    return null;
  }
  return row.reason
    ? `You can't create custom actions: ${row.reason}`
    : "You can't create custom actions.";
}

/** Banning again replaces the reason. */
export async function banCreator(userId: string, reason: string | null = null): Promise<void> {
  await drizzleDb
    .insert(customActionBans)
    .values({ userId, createdAt: new Date().toISOString(), reason })
    .onConflictDoUpdate({ target: customActionBans.userId, set: { reason } });
}

export async function unbanCreator(userId: string): Promise<void> {
  await drizzleDb
    .delete(customActionBans)
    .where(eq(customActionBans.userId, userId));
}

export async function listBannedCreators(): Promise<
  (typeof customActionBans.$inferSelect)[]
  > {
  return drizzleDb.select().from(customActionBans);
}

/** Keeps the ban row so deleting your data doesn't lift a ban. */
export function deleteUserCustomActionData(
  userId: string,
): Promise<void> {
  return serialised(async () => {
    await deleteUserRows(userId);
  });
}

async function deleteUserRows(userId: string): Promise<void> {
  const touchedGuilds = await drizzleDb
    .selectDistinct({ ownerId: customActions.ownerId })
    .from(customActions)
    .where(
      and(
        eq(customActions.scope, "guild"),
        eq(customActions.createdBy, userId),
      ),
    );
  await drizzleDb.batch([
    drizzleDb.delete(customActions).where(ownerCondition("user", userId)),
    drizzleDb
      .update(customActions)
      .set({ createdBy: null })
      .where(
        and(
          eq(customActions.scope, "guild"),
          eq(customActions.createdBy, userId),
        ),
      ),
  ]);
  for (const { ownerId } of touchedGuilds) {
    emitGuildActionsChanged(ownerId);
  }
}
