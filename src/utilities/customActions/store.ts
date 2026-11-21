import { and, eq, inArray, or, type SQL } from "drizzle-orm";
import { drizzleDb } from "../../db/connector.js";
import { customActionBans, customActions } from "../../db/schema.js";

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
  return serialised(() => upsertRow(input));
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
  if (createdBy && (await isCreatorBanned(createdBy))) {
    return { error: "You can't create custom actions." };
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
    return row ?? null;
  });
}

export async function isCreatorBanned(userId: string): Promise<boolean> {
  const [row] = await drizzleDb
    .select({ userId: customActionBans.userId })
    .from(customActionBans)
    .where(eq(customActionBans.userId, userId));
  return Boolean(row);
}

export async function banCreator(userId: string): Promise<void> {
  await drizzleDb
    .insert(customActionBans)
    .values({ userId, createdAt: new Date().toISOString() })
    .onConflictDoNothing();
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
}
