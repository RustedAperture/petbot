import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { TestDb } from "../helpers/testDb.js";
import { mockInteraction } from "../helpers/mockInteraction.js";
import { actionData, customActions } from "../../src/db/schema.js";
import { eq } from "drizzle-orm";

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

const { testDb } = vi.hoisted(() => ({
  testDb: { current: null as unknown as TestDb },
}));

vi.mock("../../src/db/connector.js", async () => {
  const { createTestDb } = await import("../helpers/testDb.js");
  testDb.current = await createTestDb();
  return { drizzleDb: testDb.current.db, default: testDb.current.db };
});

import { performAction } from "../../src/utilities/actionHelpers.js";
import { ACTIONS } from "../../src/types/constants.js";
import { command as setCommand } from "../../src/commands/slash/set.js";
import { command as serverSetCommand } from "../../src/commands/slash/serverSet.js";
import { command as leaderboardCommand } from "../../src/commands/slash/leaderboard.js";
import { command as performContext } from "../../src/commands/context/performContext.js";
import { handlePerformModal } from "../../src/modals/performModal.js";

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

function autocompleteInteraction(guildId: string | null) {
  const interaction = mockInteraction({});
  interaction.guildId = guildId;
  interaction.options.getFocused = () => "";
  interaction.respond = vi.fn();
  interaction.client = { users: { cache: { get: () => undefined } } };
  return interaction;
}

function respondedValues(interaction: any): string[] {
  return interaction.respond.mock.calls[0][0].map((c: any) => c.value);
}

beforeEach(async () => {
  vi.clearAllMocks();
  await testDb.current.db.delete(customActions);
  await testDb.current.db.delete(actionData);
});

describe("/set autocomplete", () => {
  it("offers a custom name the author has image rows for", async () => {
    await testDb.current.db.insert(actionData).values({
      userId: "user-1",
      locationId: "guild-1",
      hasPerformed: 0,
      hasReceived: 0,
      actionType: "wave",
      images: ["https://example.com/a.png"],
      createdAt: NOW,
      updatedAt: NOW,
    });

    const interaction = autocompleteInteraction("guild-1");
    await setCommand.autocomplete(interaction as any);

    expect(respondedValues(interaction)).toEqual([
      ...Object.keys(ACTIONS),
      "wave",
    ]);
  });
});

describe("/leaderboard autocomplete", () => {
  it("offers only built-ins in a DM", async () => {
    await seed("guild", "guild-1", "boop");

    const interaction = autocompleteInteraction(null);
    await leaderboardCommand.autocomplete(interaction as any);

    expect(respondedValues(interaction)).toEqual(Object.keys(ACTIONS));
  });

  it("includes the guild's actions in a guild", async () => {
    await seed("guild", "guild-1", "boop");

    const interaction = autocompleteInteraction("guild-1");
    await leaderboardCommand.autocomplete(interaction as any);

    expect(respondedValues(interaction)).toContain("boop");
  });
});

describe("/server-set", () => {
  it("replaces the image of a guild action", async () => {
    await seed("guild", "guild-1", "boop");

    const interaction = mockInteraction({
      options: { action: "boop", url: "https://example.com/boop.png" },
    });
    await serverSetCommand.execute(interaction as any);

    const [row] = await testDb.current.db
      .select()
      .from(customActions)
      .where(eq(customActions.name, "boop"));
    expect(row.image).toBe("https://example.com/boop.png");
    expect(interaction.__calls.replies[0].embeds).toBeDefined();
  });

  it("rejects an action that isn't a built-in or one of the guild's", async () => {
    await seed("user", "user-1", "wave");

    const interaction = mockInteraction({
      options: { action: "wave", url: "https://example.com/w.png" },
    });
    await serverSetCommand.execute(interaction as any);

    expect(interaction.__calls.replies[0].content).toBe(
      "That action isn't available here.",
    );
  });
});

describe("perform context menu", () => {
  it("lists the guild's actions after the built-ins", async () => {
    await seed("guild", "guild-1", "boop");
    const target = { id: "t1" };
    const interaction = mockInteraction({
      targetUser: target,
      targetMember: target,
    });
    interaction.context = 0;

    await performContext.execute(interaction as any);

    const json = interaction.__calls.showModals[0].toJSON();
    const options = json.components[0].component.options;
    expect(options.at(-1)).toMatchObject({ label: "boop (server)", value: "boop" });
    expect(options[0]).toMatchObject({ label: "pet", value: "pet" });
  });
});

describe("perform modal", () => {
  function modalFor(action: string) {
    const target = { id: "t1" };
    const editReply = vi.fn();
    return {
      editReply,
      modal: {
        customId: "perform-modal:t1",
        guildId: "guild-1",
        channelId: "channel-1",
        guild: { members: { fetch: async () => target } },
        client: { users: { fetch: async () => target } },
        member: { user: { id: "user-1" } },
        user: { id: "user-1" },
        deferReply: vi.fn(),
        editReply,
        reply: vi.fn(),
        fields: { getStringSelectValues: () => [action] },
      } as any,
    };
  }

  it("performs a guild action", async () => {
    await seed("guild", "guild-1", "boop");
    (performAction as any).mockResolvedValue("container");
    const { modal, editReply } = modalFor("boop");

    await handlePerformModal(modal);

    expect((performAction as any).mock.calls[0][0].name).toBe("boop");
    expect(editReply.mock.calls[0][0].components).toEqual(["container"]);
  });

  it("refuses an action that isn't available", async () => {
    const { modal, editReply } = modalFor("nope");

    await handlePerformModal(modal);

    expect(performAction).not.toHaveBeenCalled();
    expect(editReply.mock.calls[0][0].content).toBe(
      "That action isn't available here.",
    );
  });
});
