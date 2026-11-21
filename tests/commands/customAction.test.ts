import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { TestDb } from "../helpers/testDb.js";
import { mockInteraction } from "../helpers/mockInteraction.js";
import { customActions, customActionBans } from "../../src/db/schema.js";

vi.mock("../../src/logger.js", () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));
vi.mock("../../src/utilities/check_image.js", () => ({
  checkImage: vi.fn().mockResolvedValue(true),
}));
vi.mock("../../src/utilities/helper.js", () => ({
  canManageServer: vi.fn().mockResolvedValue(true),
}));
vi.mock("../../src/utilities/customActions/guildCommandSync.js", () => ({
  syncGuildCommands: vi.fn().mockResolvedValue(true),
}));

const { testDb } = vi.hoisted(() => ({
  testDb: { current: null as unknown as TestDb },
}));

vi.mock("../../src/db/connector.js", async () => {
  const { createTestDb } = await import("../helpers/testDb.js");
  testDb.current = await createTestDb();
  return { drizzleDb: testDb.current.db, default: testDb.current.db };
});

import { checkImage } from "../../src/utilities/check_image.js";
import { canManageServer } from "../../src/utilities/helper.js";
import { syncGuildCommands } from "../../src/utilities/customActions/guildCommandSync.js";
import { command } from "../../src/commands/slash/customAction.js";
import { listCustomActions } from "../../src/utilities/customActions/store.js";

afterAll(() => testDb.current.cleanup());

beforeEach(async () => {
  vi.clearAllMocks();
  vi.mocked(checkImage).mockResolvedValue(true);
  vi.mocked(canManageServer).mockResolvedValue(true);
  await testDb.current.db.delete(customActions);
  await testDb.current.db.delete(customActionBans);
});

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

function run(
  sub: "add" | "remove" | "list",
  opts: Record<string, string | null>,
  overrides: { guildId?: string | null; isBotInGuild?: boolean } = {},
) {
  const guildId = overrides.guildId === undefined ? "guild-1" : overrides.guildId;
  const interaction = mockInteraction({
    guildId,
    client: {
      application: { id: "bot-id" },
      guilds: { cache: { has: () => overrides.isBotInGuild ?? true } },
    },
    options: { getString: (k: string) => opts[k] ?? null },
  });
  interaction.options.getSubcommand = () => sub;
  interaction.guildId = guildId;
  return interaction;
}

const addOpts = {
  name: "boop",
  phrase: "booped",
  image: "https://example.com/a.png",
  for: "me",
};

describe("/custom-action add", () => {
  it("stores a personal action and confirms", async () => {
    const interaction = run("add", addOpts);
    await command.execute(interaction);

    expect(interaction.__calls.editedReplies[0].content).toBe(
      'Saved **boop** — "booped".',
    );
    expect(await listCustomActions("user", "user-1")).toHaveLength(1);
    expect(syncGuildCommands).not.toHaveBeenCalled();
  });

  it("stores a server action and syncs guild commands", async () => {
    const interaction = run("add", { ...addOpts, for: "server" });
    await command.execute(interaction);

    expect(await listCustomActions("guild", "guild-1")).toHaveLength(1);
    expect(syncGuildCommands).toHaveBeenCalledTimes(1);
  });

  it("rejects invalid input before anything else", async () => {
    const interaction = run("add", { ...addOpts, name: "Bad Name" });
    await command.execute(interaction);

    expect(interaction.__calls.editedReplies[0].content).toBe(
      "Names can only use letters a–z (1–20).",
    );
    expect(checkImage).not.toHaveBeenCalled();
  });

  it("rejects a server action from a non-admin", async () => {
    vi.mocked(canManageServer).mockResolvedValue(false);
    const interaction = run("add", { ...addOpts, for: "server" });
    await command.execute(interaction);

    expect(interaction.__calls.editedReplies[0].content).toBe(
      "You need Manage Server to manage server actions.",
    );
    expect(await listCustomActions("guild", "guild-1")).toHaveLength(0);
  });

  it.each([
    ["the bot is not in the guild", "guild-1", false],
    ["used outside a guild", null, true],
  ])("asks to add PetBot when %s", async (_label, guildId, isBotInGuild) => {
    const interaction = run("add", { ...addOpts, for: "server" }, { guildId, isBotInGuild });
    await command.execute(interaction);

    expect(interaction.__calls.editedReplies[0].content).toBe(
      "Add PetBot to this server to create server actions.",
    );
    expect(canManageServer).not.toHaveBeenCalled();
  });

  it("rejects an invalid image", async () => {
    vi.mocked(checkImage).mockResolvedValue(false);
    const interaction = run("add", addOpts);
    await command.execute(interaction);

    expect(interaction.__calls.editedReplies[0].content).toBe(
      "Your URL is invalid, please try again",
    );
    expect(await listCustomActions("user", "user-1")).toHaveLength(0);
  });

  it("returns the limit error verbatim", async () => {
    for (const name of ["a", "b", "c", "d", "e"]) {
      await seed("user", "user-1", name);
    }
    const interaction = run("add", addOpts);
    await command.execute(interaction);

    expect(interaction.__calls.editedReplies[0].content).toBe(
      "You've reached the limit of 5 custom actions.",
    );
  });

  it("returns the ban error verbatim", async () => {
    await testDb.current.db
      .insert(customActionBans)
      .values({ userId: "user-1", createdAt: NOW } as any);
    const interaction = run("add", addOpts);
    await command.execute(interaction);

    expect(interaction.__calls.editedReplies[0].content).toBe(
      "You can't create custom actions.",
    );
  });
});

describe("/custom-action remove", () => {
  it("removes a server action and syncs once", async () => {
    await seed("guild", "guild-1", "boop");
    const interaction = run("remove", { name: "boop", for: "server" });
    await command.execute(interaction);

    expect(interaction.__calls.editedReplies[0].content).toBe("Removed **boop**.");
    expect(syncGuildCommands).toHaveBeenCalledTimes(1);
  });

  it("does not wait for a guild sync that never resolves", async () => {
    vi.mocked(syncGuildCommands).mockReturnValueOnce(new Promise(() => {}));
    await seed("guild", "guild-1", "boop");
    const interaction = run("remove", { name: "boop", for: "server" });
    await command.execute(interaction);

    expect(interaction.__calls.editedReplies[0].content).toBe("Removed **boop**.");
  });

  it("does not wait for a guild sync when adding", async () => {
    vi.mocked(syncGuildCommands).mockReturnValueOnce(new Promise(() => {}));
    const interaction = run("add", { ...addOpts, for: "server" });
    await command.execute(interaction);

    expect(interaction.__calls.editedReplies[0].content).toBe(
      'Saved **boop** — "booped".',
    );
  });

  it("removes a personal action without syncing", async () => {
    await seed("user", "user-1", "boop");
    const interaction = run("remove", { name: "boop", for: "me" });
    await command.execute(interaction);

    expect(interaction.__calls.editedReplies[0].content).toBe("Removed **boop**.");
    expect(syncGuildCommands).not.toHaveBeenCalled();
  });

  it("says so when the action is missing", async () => {
    const interaction = run("remove", { name: "boop", for: "me" });
    await command.execute(interaction);

    expect(interaction.__calls.editedReplies[0].content).toBe(
      "There's no **boop** to remove.",
    );
  });

  it("rejects a non-admin removing a server action", async () => {
    vi.mocked(canManageServer).mockResolvedValue(false);
    await seed("guild", "guild-1", "boop");
    const interaction = run("remove", { name: "boop", for: "server" });
    await command.execute(interaction);

    expect(interaction.__calls.editedReplies[0].content).toBe(
      "You need Manage Server to manage server actions.",
    );
    expect(await listCustomActions("guild", "guild-1")).toHaveLength(1);
  });
});

describe("/custom-action list", () => {
  it("lists name and phrase lines", async () => {
    await seed("user", "user-1", "boop");
    const interaction = run("list", { for: "me" });
    await command.execute(interaction);

    expect(interaction.__calls.editedReplies[0].content).toBe("boop — booped");
  });

  it("says when there are none", async () => {
    const interaction = run("list", { for: "me" });
    await command.execute(interaction);

    expect(interaction.__calls.editedReplies[0].content).toBe(
      "No custom actions yet.",
    );
  });

  it("lets non-admins list server actions", async () => {
    vi.mocked(canManageServer).mockResolvedValue(false);
    await seed("guild", "guild-1", "boop");
    const interaction = run("list", { for: "server" });
    await command.execute(interaction);

    expect(interaction.__calls.editedReplies[0].content).toBe("boop — booped");
  });
});

describe("/custom-action remove name validation", () => {
  it("does not echo an invalid name", async () => {
    const interaction = run("remove", { name: "@everyone", for: "me" });
    await command.execute(interaction);

    expect(interaction.__calls.editedReplies[0].content).toBe(
      "There's no such action to remove.",
    );
  });
});

describe("/custom-action remove autocomplete", () => {
  async function complete(
    scope: "me" | "server",
    overrides: { guildId?: string | null; isBotInGuild?: boolean } = {},
  ) {
    const guildId = overrides.guildId === undefined ? "guild-1" : overrides.guildId;
    const respond = vi.fn();
    await command.autocomplete({
      guildId,
      user: { id: "user-1" },
      client: { guilds: { cache: { has: () => overrides.isBotInGuild ?? true } } },
      options: {
        getString: (k: string) => (k === "for" ? scope : null),
        getFocused: () => "",
        get: () => null,
      },
      respond,
    } as any);
    return respond.mock.calls[0][0];
  }

  it("suggests personal actions", async () => {
    await seed("user", "user-1", "boop");
    expect(await complete("me")).toEqual([{ name: "boop", value: "boop" }]);
  });

  it("suggests server actions when the bot is in the guild", async () => {
    await seed("guild", "guild-1", "wave");
    expect(await complete("server")).toEqual([{ name: "wave", value: "wave" }]);
  });

  it.each([
    ["the bot is not in the guild", "guild-1", false],
    ["outside a guild", null, true],
  ])("suggests nothing for server when %s", async (_l, guildId, isBotInGuild) => {
    await seed("guild", "guild-1", "wave");
    expect(await complete("server", { guildId, isBotInGuild })).toEqual([]);
  });
});
