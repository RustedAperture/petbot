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
  getActionStatsContainer: vi.fn(),
}));
vi.mock("../../src/utilities/check_image.js", () => ({
  checkImage: vi.fn().mockResolvedValue(true),
}));
vi.mock("../../src/utilities/check_user.js", () => ({
  checkUser: vi.fn(),
  isOptedOut: vi.fn().mockResolvedValue(false),
}));

const { testDb, store } = vi.hoisted(() => ({
  testDb: { current: null as unknown as TestDb },
  store: { isImageUpdateLost: false },
}));

vi.mock("../../src/utilities/customActions/store.js", async (importOriginal) => {
  const original = await importOriginal<typeof import("../../src/utilities/customActions/store.js")>();
  return {
    ...original,
    setCustomActionImage: async (...args: Parameters<typeof original.setCustomActionImage>) =>
      store.isImageUpdateLost ? false : original.setCustomActionImage(...args),
  };
});

vi.mock("../../src/db/connector.js", async () => {
  const { createTestDb } = await import("../helpers/testDb.js");
  testDb.current = await createTestDb();
  return { drizzleDb: testDb.current.db, default: testDb.current.db };
});

import { MessageFlags } from "discord.js";
import { checkImage } from "../../src/utilities/check_image.js";
import {
  getActionStatsContainer,
  performAction,
} from "../../src/utilities/actionHelpers.js";
import { command as statsContext } from "../../src/commands/context/statsContext.js";
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
  store.isImageUpdateLost = false;
  (checkImage as any).mockResolvedValue(true);
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

  it("keeps the stored image when the url fails validation", async () => {
    await seed("guild", "guild-1", "boop");
    await testDb.current.db
      .update(customActions)
      .set({ image: "https://example.com/old.png" });
    (checkImage as any).mockResolvedValue(false);

    const interaction = mockInteraction({
      options: { action: "boop", url: "https://example.com/bad.png" },
    });
    await serverSetCommand.execute(interaction as any);

    const [row] = await testDb.current.db.select().from(customActions);
    expect(row.image).toBe("https://example.com/old.png");
    expect(interaction.__calls.replies[0]).toEqual({
      content: "Your URL is invalid, please try again",
      flags: MessageFlags.Ephemeral,
    });
  });

  it("does not confirm when the action was removed before the image update", async () => {
    await seed("guild", "guild-1", "boop");
    store.isImageUpdateLost = true;

    const interaction = mockInteraction({
      options: { action: "boop", url: "https://example.com/boop.png" },
    });
    await serverSetCommand.execute(interaction as any);

    expect(interaction.__calls.replies).toEqual([
      {
        content: "That action isn't available here.",
        flags: MessageFlags.Ephemeral,
      },
    ]);
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
    const { modal } = modalFor("nope");

    await handlePerformModal(modal);

    expect(performAction).not.toHaveBeenCalled();
    expect(modal.deferReply).not.toHaveBeenCalled();
    expect(modal.reply).toHaveBeenCalledWith({
      content: "That action isn't available here.",
      flags: MessageFlags.Ephemeral,
    });
  });
});

describe("/leaderboard totals", () => {
  async function seedRow(userId: string, actionType: string, performed: number) {
    await testDb.current.db.insert(actionData).values({
      userId,
      locationId: "guild-1",
      hasPerformed: performed,
      hasReceived: 0,
      actionType,
      images: [],
      createdAt: NOW,
      updatedAt: NOW,
    });
  }

  it("ignores another person's personal action at the guild when unfiltered", async () => {
    await seedRow("user-1", "pet", 5);
    await seedRow("user-2", "wave", 100);

    const interaction = mockInteraction({});
    await leaderboardCommand.execute(interaction as any);

    const description = interaction.__calls.editedReplies[0].embeds[0].data.description;
    expect(description.split("\n")).toHaveLength(1);
    expect(description).toContain("— 5 **(you)**");
  });
});

describe("stats context menu", () => {
  const target = { id: "t1", fetch: vi.fn().mockResolvedValue(true) };

  async function run() {
    (getActionStatsContainer as any).mockResolvedValue({ container: "c" });
    const interaction = mockInteraction({
      targetUser: target,
      targetMember: target,
    });
    interaction.context = 0;
    await statsContext.execute(interaction as any);
    return (getActionStatsContainer as any).mock.calls.map((c: any[]) => c[0].name);
  }

  it("gives no card to a guild definition the target never used", async () => {
    await seed("guild", "guild-1", "boop");

    expect(await run()).toEqual(Object.keys(ACTIONS));
  });

  it("still shows a card for a historical row whose definition was removed", async () => {
    await testDb.current.db.insert(actionData).values({
      userId: "t1",
      locationId: "guild-1",
      hasPerformed: 1,
      hasReceived: 0,
      actionType: "gone",
      images: [],
      createdAt: NOW,
      updatedAt: NOW,
    });

    expect(await run()).toEqual([...Object.keys(ACTIONS), "gone"]);
  });
});
