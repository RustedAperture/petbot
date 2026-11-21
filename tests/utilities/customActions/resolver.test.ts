import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { TestDb } from "../../helpers/testDb.js";
import { actionData, customActions } from "../../../src/db/schema.js";

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
  listSettableActionNames,
  pickCustomActionImage,
  resolveAction,
  resolveAvailableActions,
  resolveBuiltIn,
  type ResolvedAction,
} from "../../../src/utilities/customActions/resolver.js";

afterAll(() => testDb.current.cleanup());

const NOW = "2026-01-01T00:00:00.000Z";

async function seed(
  scope: "guild" | "user",
  ownerId: string,
  name: string,
  phrase: string,
  image: string | null = null,
) {
  await testDb.current.db.insert(customActions).values({
    name,
    phrase,
    scope,
    ownerId,
    image,
    createdBy: null,
    createdAt: NOW,
    updatedAt: NOW,
  });
}

const BUILT_INS = ["pet", "bite", "hug", "bonk", "squish", "explode"];

beforeEach(async () => {
  await testDb.current.db.delete(customActions);
  await testDb.current.db.delete(actionData);
});

describe("resolveBuiltIn", () => {
  it("maps a built-in to its configured phrase and image source", () => {
    expect(resolveBuiltIn("bite")).toMatchObject({
      name: "bite",
      phrase: "bitten",
      isBuiltIn: true,
      sources: ["builtin"],
      imageSource: "author",
      definitionImages: {},
    });
    expect(resolveBuiltIn("pet").builtInDefaultImage).toContain("belly");
  });
});

describe("resolveAction", () => {
  it("merges a name defined by the guild and the target, preferring the guild phrase", async () => {
    await seed("guild", "G", "boop", "booped by the guild", "g.png");
    await seed("user", "T", "boop", "booped", "t.png");
    const a = await resolveAction("boop", {
      guildId: "G",
      locationId: "G",
      authorId: "A",
      targetId: "T",
      isRestricted: false,
    });
    expect(a).toMatchObject({
      name: "boop",
      phrase: "booped by the guild",
      isBuiltIn: false,
      sources: ["guild", "user"],
      imageSource: "custom",
      definitionImages: { guild: "g.png", target: "t.png" },
    });
  });

  it("prefers the target phrase over the author phrase", async () => {
    await seed("user", "A", "boop", "author phrase");
    await seed("user", "T", "boop", "target phrase");
    const a = await resolveAction("boop", {
      guildId: null,
      locationId: "dm",
      authorId: "A",
      targetId: "T",
      isRestricted: false,
    });
    expect(a?.phrase).toBe("target phrase");
  });

  it("returns a built-in and null for an unknown name", async () => {
    const ctx = {
      guildId: "G",
      locationId: "G",
      authorId: "A",
      isRestricted: false,
    };
    expect((await resolveAction("hug", ctx))?.isBuiltIn).toBe(true);
    expect(await resolveAction("nope", ctx)).toBeNull();
  });
});

describe("resolveAvailableActions", () => {
  it("hides personal actions in a restricted guild", async () => {
    await seed("user", "A", "zap", "zapped");
    await seed("guild", "G", "wave", "waved at");
    const names = (
      await resolveAvailableActions({
        guildId: "G",
        locationId: "G",
        authorId: "A",
        isRestricted: true,
      })
    ).map((a) => a.name);
    expect(names).toEqual([...BUILT_INS, "wave"]);
  });

  it("lists built-ins, then custom names alphabetically", async () => {
    await seed("user", "A", "zap", "zapped");
    await seed("guild", "G", "boop", "booped");
    const names = (
      await resolveAvailableActions({
        guildId: "G",
        locationId: "G",
        authorId: "A",
        isRestricted: false,
      })
    ).map((a) => a.name);
    expect(names).toEqual([...BUILT_INS, "boop", "zap"]);
  });

  it("lists a name once when the guild and the target both define it", async () => {
    await seed("guild", "G", "boop", "booped by the guild");
    await seed("user", "T", "boop", "booped");
    const names = (
      await resolveAvailableActions({
        guildId: "G",
        locationId: "G",
        authorId: "A",
        targetId: "T",
        isRestricted: false,
      })
    ).map((a) => a.name);
    expect(names.filter((n) => n === "boop")).toHaveLength(1);
  });

  it("in a DM, offers the author's and the target's personal actions", async () => {
    await seed("user", "A", "zap", "zapped");
    await seed("user", "T", "boop", "booped");
    await seed("guild", "G", "wave", "waved at");
    const names = (
      await resolveAvailableActions({
        guildId: null,
        locationId: "dm",
        authorId: "A",
        targetId: "T",
        isRestricted: false,
      })
    ).map((a) => a.name);
    expect(names).toEqual([...BUILT_INS, "boop", "zap"]);
  });
});

describe("listSettableActionNames", () => {
  it("includes a custom name the author only has an actionData row for", async () => {
    await seed("guild", "G", "wave", "waved at");
    await testDb.current.db.insert(actionData).values([
      {
        userId: "A",
        locationId: "other",
        actionType: "boop",
        images: [],
        createdAt: NOW,
        updatedAt: NOW,
      },
      {
        userId: "A",
        locationId: "other",
        actionType: "hug",
        images: [],
        createdAt: NOW,
        updatedAt: NOW,
      },
    ]);
    const names = await listSettableActionNames({
      guildId: "G",
      locationId: "G",
      authorId: "A",
      isRestricted: false,
    });
    expect(names).toEqual([...BUILT_INS, "wave", "boop"]);
  });
});

describe("pickCustomActionImage", () => {
  it.each([
    [["t.png"], ["a.png"], false, "t.png"],
    [[], ["a.png"], false, "a.png"],
    [[], [], false, "guild.png"],
    [["t.png"], ["a.png"], true, "guild.png"],
  ])(
    "pickCustomActionImage(%j, %j, restricted=%s) -> %s",
    (t, a, isRestricted, expected) => {
      const action = {
        definitionImages: {
          guild: "guild.png",
          target: "tdef.png",
          author: "adef.png",
        },
      } as ResolvedAction;
      expect(pickCustomActionImage(action, t, a, isRestricted)).toBe(expected);
    },
  );

  it.each([
    [{ target: "tdef.png", author: "adef.png" }, false, "tdef.png"],
    [{ author: "adef.png" }, false, "adef.png"],
    [{ target: "tdef.png", author: "adef.png" }, true, null],
    [{}, false, null],
  ])("falls back through definitions %j (restricted=%s)", (defs, isRestricted, expected) => {
    const action = { definitionImages: defs } as ResolvedAction;
    expect(pickCustomActionImage(action, [], [], isRestricted)).toBe(expected);
  });
});
