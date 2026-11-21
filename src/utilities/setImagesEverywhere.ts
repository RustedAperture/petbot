import { and, eq, isNotNull } from "drizzle-orm";
import { drizzleDb } from "../db/connector.js";
import { actionData } from "../db/schema.js";
import { ACTIONS } from "../types/constants.js";
import { listAllCustomActions } from "./customActions/store.js";

/**
 * Sets a user's images for an action in every place they've used PetBot.
 * Places with no record for the action get one only when the action works
 * there: built-ins and personal actions. A server action stays in its server.
 */
export async function setImagesEverywhere(
  userId: string,
  actionType: string,
  images: string[],
): Promise<void> {
  const now = new Date().toISOString();
  await drizzleDb
    .update(actionData)
    .set({ images, updatedAt: now })
    .where(and(eq(actionData.userId, userId), eq(actionData.actionType, actionType)));

  const isUsableEverywhere =
    Object.hasOwn(ACTIONS, actionType) ||
    (await listAllCustomActions({ name: actionType, scope: "user" })).length > 0;
  if (!isUsableEverywhere) {
    return;
  }

  const places = await drizzleDb
    .selectDistinct({ locationId: actionData.locationId })
    .from(actionData)
    .where(and(eq(actionData.userId, userId), isNotNull(actionData.locationId)));
  if (places.length === 0) {
    return;
  }
  await drizzleDb
    .insert(actionData)
    .values(
      places.map((place) => ({
        userId,
        locationId: place.locationId,
        actionType,
        hasPerformed: 0,
        hasReceived: 0,
        images,
        createdAt: now,
        updatedAt: now,
      })),
    )
    .onConflictDoNothing();
}
