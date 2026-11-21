import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { TestDb } from "../../helpers/testDb.js";
import { customActions } from "../../../src/db/schema.js";

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

import { createGuildNameCache } from "../../../src/utilities/customActions/guildNameCache.js";
import { guildActionListenerCount } from "../../../src/utilities/customActions/changeEvents.js";
import {
  deleteCustomActionById,
  deleteUserCustomActionData,
  removeCustomAction,
  setCustomActionImage,
  upsertCustomAction,
} from "../../../src/utilities/customActions/store.js";

afterAll(() => testDb.current.cleanup());

beforeEach(async () => {
  await testDb.current.db.delete(customActions);
});

const guildAction = (name = "boop", createdBy: string | null = "u1") => ({
  scope: "guild" as const,
  ownerId: "g1",
  name,
  phrase: "booped",
  image: null,
  createdBy,
});

describe("guild name cache invalidation", () => {
  it("sees an action created after the cache warmed, immediately", async () => {
    const cache = createGuildNameCache("g1");
    expect(await cache.hasName("boop")).toBe(false);
    expect(cache.hasName("boop")).toBe(false);

    await upsertCustomAction(guildAction());

    expect(await cache.hasName("boop")).toBe(true);
    cache.dispose();
  });

  it("stops seeing a removed action", async () => {
    await upsertCustomAction(guildAction());
    const cache = createGuildNameCache("g1");
    expect(await cache.hasName("boop")).toBe(true);

    await removeCustomAction("guild", "g1", "boop");

    expect(await cache.hasName("boop")).toBe(false);
    cache.dispose();
  });

  it("discards a load that was in flight when the actions changed", async () => {
    const cache = createGuildNameCache("g1");
    const stale = cache.hasName("boop");
    await upsertCustomAction(guildAction());
    await stale;

    expect(await cache.hasName("boop")).toBe(true);
    cache.dispose();
  });

  it.each([
    ["setCustomActionImage", () => setCustomActionImage("guild", "g1", "boop", "https://i/x")],
    ["deleteCustomActionById", async () => {
      const [row] = await testDb.current.db.select().from(customActions);
      return deleteCustomActionById(row.id);
    }],
    ["deleteUserCustomActionData", () => deleteUserCustomActionData("u1")],
  ])("%s on a guild row invalidates the cache", async (_name, mutate) => {
    await upsertCustomAction(guildAction());
    const cache = createGuildNameCache("g1");
    await cache.hasName("boop");
    expect(cache.hasName("boop")).toBe(true);
    const loads = vi.spyOn(testDb.current.db, "select");
    loads.mockClear();

    await mutate();
    await cache.hasName("boop");

    expect(loads).toHaveBeenCalled();
    cache.dispose();
    loads.mockRestore();
  });

  it("ignores personal actions and other guilds, and stops listening once disposed", async () => {
    const cache = createGuildNameCache("g1");
    expect(guildActionListenerCount("g1")).toBe(1);
    await cache.hasName("x");
    await upsertCustomAction({ ...guildAction("wave"), scope: "user", ownerId: "u1" });
    await upsertCustomAction({ ...guildAction("wave"), ownerId: "g2" });
    expect(cache.hasName("wave")).toBe(false);

    cache.dispose();
    expect(guildActionListenerCount("g1")).toBe(0);
  });
});
