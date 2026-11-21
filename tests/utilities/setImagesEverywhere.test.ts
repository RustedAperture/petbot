import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { and, eq } from "drizzle-orm";
import type { TestDb } from "../helpers/testDb.js";
import { actionData, customActions } from "../../src/db/schema.js";

const { testDb } = vi.hoisted(() => ({
  testDb: { current: null as unknown as TestDb },
}));

vi.mock("../../src/db/connector.js", async () => {
  const { createTestDb } = await import("../helpers/testDb.js");
  testDb.current = await createTestDb();
  return { drizzleDb: testDb.current.db, default: testDb.current.db };
});

import { setImagesEverywhere } from "../../src/utilities/setImagesEverywhere.js";

const now = "2026-01-01";
const rowFor = (locationId: string, actionType: string, images: string[] = []) => ({
  userId: "u1",
  locationId,
  actionType,
  hasPerformed: 2,
  hasReceived: 0,
  images,
  createdAt: now,
  updatedAt: now,
});
const definition = (name: string, scope: "user" | "guild") => ({
  name,
  phrase: "did",
  scope,
  ownerId: scope === "user" ? "u9" : "g1",
  image: null,
  createdBy: "u9",
  createdAt: now,
  updatedAt: now,
});

async function imagesAt(locationId: string, actionType: string) {
  const [row] = await testDb.current.db
    .select()
    .from(actionData)
    .where(
      and(
        eq(actionData.userId, "u1"),
        eq(actionData.locationId, locationId),
        eq(actionData.actionType, actionType),
      ),
    );
  return row ? { images: row.images, hasPerformed: row.hasPerformed } : null;
}

afterAll(() => testDb.current.cleanup());

beforeEach(async () => {
  await testDb.current.db.delete(actionData);
  await testDb.current.db.delete(customActions);
  await testDb.current.db.insert(customActions).values([
    definition("boop", "user"),
    definition("zap", "guild"),
  ]);
  await testDb.current.db.insert(actionData).values([
    rowFor("g1", "pet", ["https://old/1.png"]),
    rowFor("g1", "zap"),
    rowFor("g2", "hug"),
  ]);
});

describe("setImagesEverywhere", () => {
  it.each(["pet", "boop"])(
    "sets %s in every place the user has used PetBot",
    async (action) => {
      await setImagesEverywhere("u1", action, ["https://new/1.png"]);
      for (const place of ["g1", "g2"]) {
        expect((await imagesAt(place, action))?.images).toEqual([
          "https://new/1.png",
        ]);
      }
    },
  );

  it("keeps a server action in the places it already has a record, with its counts", async () => {
    await setImagesEverywhere("u1", "zap", ["https://new/1.png"]);
    expect(await imagesAt("g1", "zap")).toEqual({
      images: ["https://new/1.png"],
      hasPerformed: 2,
    });
    expect(await imagesAt("g2", "zap")).toBeNull();
  });
});
