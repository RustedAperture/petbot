import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { TestDb } from "../helpers/testDb.js";
import { mockInteraction } from "../helpers/mockInteraction.js";
import { MessageFlags } from "discord.js";
import { botData, customActions } from "../../src/db/schema.js";

vi.mock("../../src/logger.js", () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));
vi.mock("../../src/utilities/actionHelpers.js", () => ({
  performAction: vi.fn(),
}));
vi.mock("../../src/utilities/check_user.js", () => ({
  checkUser: vi.fn(),
  isOptedOut: vi.fn().mockResolvedValue(false),
}));

const { testDb, store } = vi.hoisted(() => ({
  testDb: { current: null as unknown as TestDb },
  store: { forceGuildListing: false },
}));

vi.mock("../../src/utilities/customActions/store.js", async (importOriginal) => {
  const original = await importOriginal<typeof import("../../src/utilities/customActions/store.js")>();
  return {
    ...original,
    listCustomActions: async (scope: "guild" | "user", ownerId: string) =>
      store.forceGuildListing && scope === "guild"
        ? [{ name: "boop", scope, ownerId }]
        : original.listCustomActions(scope, ownerId),
  };
});

vi.mock("../../src/db/connector.js", async () => {
  const { createTestDb } = await import("../helpers/testDb.js");
  testDb.current = await createTestDb();
  return { drizzleDb: testDb.current.db, default: testDb.current.db };
});

import { performAction } from "../../src/utilities/actionHelpers.js";
import { command } from "../../src/commands/slash/action.js";
import { respondWithActions } from "../../src/commands/actionAutocomplete.js";
import { executeCustomGuildCommand } from "../../src/commands/customGuildCommand.js";

afterAll(() => testDb.current.cleanup());

const NOW = "2026-01-01T00:00:00.000Z";

async function seed(scope: "guild" | "user", ownerId: string, name: string) {
  await testDb.current.db.insert(customActions).values({
    name,
    phrase: "booped",
    scope,
    ownerId,
    image: null,
    createdBy: null,
    createdAt: NOW,
    updatedAt: NOW,
  });
}

function buildInteraction(opts: {
  actionName?: string;
  focused?: string;
  targetId?: string | null;
  commandName?: string;
  guildId?: string | null;
  cachedUsers?: Record<string, any>;
}) {
  const target = { id: "target-1", fetch: vi.fn().mockResolvedValue(true) };
  const interaction = mockInteraction({
    guildId: opts.guildId === undefined ? "guild-1" : opts.guildId,
    options: {
      getUser: () => target,
      getMember: () => target,
    },
  });
  interaction.commandName = opts.commandName ?? "action";
  interaction.context = 0;
  interaction.options.getString = (k: string, _required?: boolean) =>
    k === "action" ? (opts.actionName ?? null) : null;
  interaction.options.getFocused = () => opts.focused ?? "";
  interaction.options.get = (k: string) =>
    k === "target" && opts.targetId !== null
      ? { value: opts.targetId ?? "target-1" }
      : null;
  interaction.respond = vi.fn();
  interaction.client = {
    users: { cache: { get: (id: string) => opts.cachedUsers?.[id] } },
  };
  return interaction;
}

beforeEach(async () => {
  vi.clearAllMocks();
  store.forceGuildListing = false;
  await testDb.current.db.delete(customActions);
  await testDb.current.db.delete(botData);
  (performAction as any).mockResolvedValue("container");
});

describe("/action autocomplete", () => {
  async function choices(opts: Parameters<typeof buildInteraction>[0]) {
    const interaction = buildInteraction(opts);
    await command.autocomplete(interaction as any);
    return interaction.respond.mock.calls[0][0] as Array<{
      name: string;
      value: string;
    }>;
  }

  it("includes built-ins, guild actions and the target's personal names", async () => {
    await seed("guild", "guild-1", "boop");
    await seed("user", "target-1", "wave");
    await seed("user", "someone-else", "hidden");

    const result = await choices({ targetId: "target-1" });

    expect(result).toContainEqual({ name: "pet", value: "pet" });
    expect(result).toContainEqual({ name: "boop · server", value: "boop" });
    expect(result).toContainEqual({ name: "wave · personal", value: "wave" });
    expect(result.map((c) => c.value)).not.toContain("hidden");
  });

  it("leaves the target's personal names out without a target", async () => {
    await seed("user", "target-1", "wave");

    const result = await choices({ targetId: null });

    expect(result.map((c) => c.value)).not.toContain("wave");
  });

  it("filters by case-insensitive prefix and caps at 25", async () => {
    const names = Array.from({ length: 30 }, (_, i) => `a${"b".repeat(i + 1)}`);
    const interaction = buildInteraction({ focused: "AB" });
    await respondWithActions(interaction as any, names);

    expect(interaction.respond.mock.calls[0][0]).toHaveLength(25);

    const filtered = buildInteraction({ focused: "PE" });
    await respondWithActions(filtered as any, ["pet", "hug"]);
    expect(filtered.respond).toHaveBeenCalledWith([{ name: "pet", value: "pet" }]);
  });

  const personal = (ownerIds: string[]) => ({
    name: "wave",
    phrase: "waved",
    isBuiltIn: false,
    sources: ["user" as const],
    imageSource: "custom" as const,
    definitionImages: {},
    personalOwnerIds: ownerIds,
  });

  it.each([
    ["author-owned", ["user-1"], {}, "wave · yours"],
    ["target-owned with a cached user", ["target-1"], { "target-1": { displayName: "Sam", username: "sam" } }, "wave · @Sam"],
    ["target-owned with a cached user lacking a display name", ["target-1"], { "target-1": { username: "sam" } }, "wave · @sam"],
    ["target-owned with an uncached user", ["target-1"], {}, "wave · personal"],
  ])("labels %s personal actions from an ID-only target option", async (_l, owners, cachedUsers, expected) => {
    const interaction = buildInteraction({ cachedUsers });
    await respondWithActions(interaction as any, [personal(owners)]);

    expect(interaction.respond).toHaveBeenCalledWith([{ name: expected, value: "wave" }]);
  });
});

describe("/action execute", () => {
  it("performs a resolvable custom action once", async () => {
    await seed("guild", "guild-1", "boop");
    const interaction = buildInteraction({ actionName: "boop" });

    await command.execute(interaction as any);

    expect(performAction).toHaveBeenCalledTimes(1);
    expect((performAction as any).mock.calls[0][0].name).toBe("boop");
    expect(interaction.__calls.editedReplies).toHaveLength(1);
  });

  it("rejects a removed action ephemerally without performing", async () => {
    const interaction = buildInteraction({ actionName: "boop" });

    await command.execute(interaction as any);

    expect(performAction).not.toHaveBeenCalled();
    expect(interaction.__calls.replies[0]).toMatchObject({
      content: "That action isn't available here.",
    });
    expect(interaction.__calls.replies[0].flags).toBe(MessageFlags.Ephemeral);
  });

  it("rejects a personal-only action in a restricted guild", async () => {
    await seed("user", "target-1", "wave");
    await testDb.current.db.insert(botData).values({
      guildId: "guild-1",
      restricted: true,
      createdAt: NOW,
      updatedAt: NOW,
    });
    const interaction = buildInteraction({ actionName: "wave" });

    await command.execute(interaction as any);

    expect(performAction).not.toHaveBeenCalled();
    expect(interaction.__calls.replies[0]).toEqual({
      content: "That action isn't available here.",
      flags: MessageFlags.Ephemeral,
    });
  });
});

describe("executeCustomGuildCommand", () => {
  it("runs a guild action fixed to the command name", async () => {
    await seed("guild", "guild-1", "boop");
    const interaction = buildInteraction({ commandName: "boop" });

    expect(await executeCustomGuildCommand(interaction as any)).toBe(true);
    expect((performAction as any).mock.calls[0][0].name).toBe("boop");
  });

  it("does not run a same-named personal action when the guild definition is gone", async () => {
    store.forceGuildListing = true;
    await seed("user", "user-1", "boop");
    const interaction = buildInteraction({ commandName: "boop" });

    expect(await executeCustomGuildCommand(interaction as any)).toBe(true);

    expect(performAction).not.toHaveBeenCalled();
    expect(interaction.__calls.replies[0]).toEqual({
      content: "That action isn't available here.",
      flags: MessageFlags.Ephemeral,
    });
  });

  it.each([
    ["no guild action has that name", "boop", "guild-1"],
    ["there is no guild", "boop", null],
  ])("returns false when %s", async (_label, commandName, guildId) => {
    await seed("user", "user-1", "boop");
    const interaction = buildInteraction({ commandName, guildId });

    expect(await executeCustomGuildCommand(interaction as any)).toBe(false);
    expect(performAction).not.toHaveBeenCalled();
  });
});
