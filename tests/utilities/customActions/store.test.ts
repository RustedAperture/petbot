import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import type { TestDb } from "../../helpers/testDb.js";
import { actionData, customActionBans, customActions } from "../../../src/db/schema.js";

vi.mock("../../../src/logger.js", () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

const { testDb } = vi.hoisted(() => ({
  testDb: { current: null as unknown as TestDb },
}));

vi.mock("../../../src/db/connector.js", async () => {
  const { createTestDb } = await import("../../helpers/testDb.js");
  testDb.current = await createTestDb();
  return { drizzleDb: testDb.current.db, default: testDb.current.db };
});

import {
  banCreator,
  CUSTOM_ACTION_LIMIT,
  deleteCustomActionById,
  deleteUserCustomActionData,
  creatorBanMessage,
  listAllCustomActions,
  listBannedCreators,
  listCustomActions,
  listCustomActionsForOwners,
  removeCustomAction,
  setCustomActionImage,
  unbanCreator,
  upsertCustomAction,
} from "../../../src/utilities/customActions/store.js";

afterAll(() => testDb.current.cleanup());

beforeEach(async () => {
  await testDb.current.db.delete(customActions);
  await testDb.current.db.delete(customActionBans);
});

const input = (over: Partial<Parameters<typeof upsertCustomAction>[0]> = {}) => ({
  scope: "user" as const,
  ownerId: "u1",
  name: "boop",
  phrase: "booped",
  image: null,
  createdBy: "u1",
  ...over,
});

describe("upsertCustomAction", () => {
  it("creates a row, then updates it in place", async () => {
    const created = await upsertCustomAction(input());
    const updated = await upsertCustomAction(input({ phrase: "bopped" }));
    expect(created).toHaveProperty("action");
    expect(updated).toHaveProperty("action");
    if ("error" in created || "error" in updated) {
      throw new Error("unexpected");
    }
    expect(updated.action.id).toBe(created.action.id);
    expect(updated.action.phrase).toBe("bopped");
    expect(await listCustomActions("user", "u1")).toHaveLength(1);
  });

  it.each([
    ["user", "You've reached the limit of 5 custom actions."],
    ["guild", "This server has reached the limit of 5 custom actions."],
  ] as const)("rejects the 6th insert for %s scope", async (scope, error) => {
    for (let i = 0; i < CUSTOM_ACTION_LIMIT; i++) {
      const name = "a".repeat(i + 1);
      expect(await upsertCustomAction(input({ scope, name }))).toHaveProperty(
        "action",
      );
    }
    expect(await upsertCustomAction(input({ scope, name: "zzz" }))).toEqual({
      error,
    });
  });

  it("allows updating an existing action at the limit", async () => {
    for (let i = 0; i < CUSTOM_ACTION_LIMIT; i++) {
      await upsertCustomAction(input({ name: "a".repeat(i + 1) }));
    }
    expect(
      await upsertCustomAction(input({ name: "a", phrase: "new" })),
    ).toHaveProperty("action");
  });

  it("keeps the original createdBy when another admin edits", async () => {
    const guild = { scope: "guild" as const, ownerId: "g1" };
    await upsertCustomAction(input({ ...guild, createdBy: "admin1" }));
    const edited = await upsertCustomAction(
      input({ ...guild, createdBy: "admin2", phrase: "bopped" }),
    );
    if ("error" in edited) {
      throw new Error("unexpected");
    }
    expect(edited.action.createdBy).toBe("admin1");
    expect(edited.action.phrase).toBe("bopped");
  });

  it("never exceeds the limit under concurrent inserts", async () => {
    for (let i = 0; i < CUSTOM_ACTION_LIMIT - 1; i++) {
      await upsertCustomAction(input({ name: "a".repeat(i + 1) }));
    }
    const results = await Promise.all([
      upsertCustomAction(input({ name: "x" })),
      upsertCustomAction(input({ name: "y" })),
    ]);
    expect(results.filter((r) => "action" in r)).toHaveLength(1);
    expect(results.filter((r) => "error" in r)).toHaveLength(1);
    expect(await listCustomActions("user", "u1")).toHaveLength(
      CUSTOM_ACTION_LIMIT,
    );
  });

  it("resolves concurrent upserts of the same new name", async () => {
    const results = await Promise.all([
      upsertCustomAction(input({ phrase: "one" })),
      upsertCustomAction(input({ phrase: "two" })),
    ]);
    expect(results.every((r) => "action" in r)).toBe(true);
    expect(await listCustomActions("user", "u1")).toHaveLength(1);
  });

  it("does not block ordinary actionData writes while upserts are in flight", async () => {
    await testDb.current.db.delete(actionData);
    const now = "2026-01-01T00:00:00.000Z";
    const upserts = Array.from({ length: 4 }, (_, i) =>
      upsertCustomAction(input({ name: `n${i}` })),
    );
    const writes = Array.from({ length: 8 }, (_, i) =>
      testDb.current.db.insert(actionData).values({
        userId: `w${i}`,
        locationId: "g1",
        actionType: "pet",
        createdAt: now,
        updatedAt: now,
      }),
    );

    await expect(Promise.all([...upserts, ...writes])).resolves.toBeDefined();
    expect(await testDb.current.db.select().from(actionData)).toHaveLength(8);
  });

  it("runs an owner delete queued behind an in-flight upsert-update after it", async () => {
    const created = await upsertCustomAction(input());
    const id = "action" in created ? created.action.id : -1;

    const [upserted, deleted] = await Promise.all([
      upsertCustomAction(input({ phrase: "changed" })),
      deleteCustomActionById(id),
    ]);

    expect("action" in upserted && upserted.action.phrase).toBe("changed");
    expect(deleted?.phrase).toBe("changed");
    expect(await listCustomActions("user", "u1")).toHaveLength(0);
  });

  it("reports unavailable when an image update finds the action gone", async () => {
    expect(await setCustomActionImage("user", "u1", "gone", "https://i/x")).toBe(false);
  });

  it("rejects a banned creator", async () => {
    await banCreator("u1");
    expect(await upsertCustomAction(input())).toEqual({
      error: "You can't create custom actions.",
    });
  });
});

describe("queries", () => {
  it("lists by owners across scopes", async () => {
    await upsertCustomAction(input());
    await upsertCustomAction(input({ ownerId: "u2", createdBy: "u2" }));
    await upsertCustomAction(input({ ownerId: "u3", createdBy: "u3" }));
    await upsertCustomAction(
      input({ scope: "guild", ownerId: "g1", name: "wave" }),
    );
    const rows = await listCustomActionsForOwners("g1", ["u1", "u2"]);
    expect(rows.map((r) => `${r.scope}:${r.ownerId}`).sort()).toEqual([
      "guild:g1",
      "user:u1",
      "user:u2",
    ]);
    expect(await listCustomActionsForOwners(null, [])).toEqual([]);
    expect(await listCustomActionsForOwners(null, ["u3"])).toHaveLength(1);
  });

  it("filters all actions", async () => {
    await upsertCustomAction(input());
    await upsertCustomAction(input({ ownerId: "u2", createdBy: "u2" }));
    await upsertCustomAction(input({ name: "wave" }));
    expect(await listAllCustomActions({})).toHaveLength(3);
    expect(await listAllCustomActions({ name: "boop" })).toHaveLength(2);
    expect(await listAllCustomActions({ ownerId: "u1" })).toHaveLength(2);
    expect(await listAllCustomActions({ scope: "guild" })).toHaveLength(0);
  });
});

describe("mutations", () => {
  it("removes and sets image", async () => {
    await upsertCustomAction(input());
    expect(await setCustomActionImage("user", "u1", "boop", "https://i/x")).toBe(
      true,
    );
    expect((await listCustomActions("user", "u1"))[0].image).toBe("https://i/x");
    expect(await setCustomActionImage("user", "u1", "nope", null)).toBe(false);
    expect(await removeCustomAction("user", "u1", "boop")).toBe(true);
    expect(await removeCustomAction("user", "u1", "boop")).toBe(false);
  });

  it("deletes by id and returns the row", async () => {
    const res = await upsertCustomAction(input());
    if ("error" in res) {
      throw new Error("unexpected");
    }
    expect((await deleteCustomActionById(res.action.id))?.name).toBe("boop");
    expect(await deleteCustomActionById(res.action.id)).toBeNull();
  });
});

describe("bans", () => {
  it("bans, lists and unbans", async () => {
    expect(await creatorBanMessage("u1")).toBeNull();
    await banCreator("u1");
    expect(await creatorBanMessage("u1")).toBe("You can't create custom actions.");
    await banCreator("u1", "spam");
    expect(await creatorBanMessage("u1")).toBe("You can't create custom actions: spam");
    expect((await listBannedCreators()).map((b) => b.userId)).toEqual(["u1"]);
    await unbanCreator("u1");
    expect(await creatorBanMessage("u1")).toBeNull();
  });
});

describe("deleteUserCustomActionData", () => {
  it("removes personal rows, nulls createdBy on guild rows and keeps the ban", async () => {
    await upsertCustomAction(input());
    await upsertCustomAction(
      input({ scope: "guild", ownerId: "g1", name: "wave" }),
    );
    await upsertCustomAction(
      input({ ownerId: "u2", name: "poke", createdBy: "u1" }),
    );
    await banCreator("u1");
    await deleteUserCustomActionData("u1");
    const other = await listCustomActions("user", "u2");
    expect(other[0].createdBy).toBe("u1");
    expect(await listCustomActions("user", "u1")).toEqual([]);
    const guild = await testDb.current.db
      .select()
      .from(customActions)
      .where(eq(customActions.ownerId, "g1"));
    expect(guild[0].createdBy).toBeNull();
    expect(await creatorBanMessage("u1")).not.toBeNull();
  });
});
