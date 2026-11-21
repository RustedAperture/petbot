import { vi, describe, it, expect, beforeEach } from "vitest";
import { MessageFlags } from "discord.js";

vi.mock("../../src/utilities/resetAction.js", () => ({ resetAction: vi.fn() }));
vi.mock("../../src/logger.js", () => ({
  default: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock("../../src/commands/customGuildCommand.js", () => ({
  executeCustomGuildCommand: vi.fn(),
}));

import { executeCustomGuildCommand } from "../../src/commands/customGuildCommand.js";
import interactionCreate from "../../src/events/interactionCreate.js";
import { resetAction } from "../../src/utilities/resetAction.js";
import logger from "../../src/logger.js";

beforeEach(() => {
  vi.restoreAllMocks();
  vi.mocked(logger.error).mockClear();
  vi.mocked(executeCustomGuildCommand).mockReset();
});

describe("interactionCreate", () => {
  it("executes a found chat command", async () => {
    const executed = vi.fn();
    const client: any = { slashCommands: new Map([["foo", { execute: executed }]]) };
    const interaction: any = {
      client,
      isChatInputCommand: () => true,
      isAutocomplete: () => false,
      isUserContextMenuCommand: () => false,
      isMessageContextMenuCommand: () => false,
      commandName: "foo",
    };

    await interactionCreate.execute(interaction);

    expect(executed).toHaveBeenCalledWith(interaction);
  });

  it("replies with error when command throws and not deferred/replied", async () => {
    const executed = vi.fn().mockRejectedValue(new Error("boom"));
    const client: any = { slashCommands: new Map([["foo", { execute: executed }]]) };
    const interaction: any = {
      client,
      isChatInputCommand: () => true,
      isAutocomplete: () => false,
      isUserContextMenuCommand: () => false,
      isMessageContextMenuCommand: () => false,
      commandName: "foo",
      replied: false,
      deferred: false,
      reply: vi.fn(),
    };

    await interactionCreate.execute(interaction);

    expect(interaction.reply).toHaveBeenCalled();
  });

  it("edits reply when command throws and was deferred", async () => {
    const executed = vi.fn().mockRejectedValue(new Error("boom"));
    const client: any = { slashCommands: new Map([["foo", { execute: executed }]]) };
    const interaction: any = {
      client,
      isChatInputCommand: () => true,
      isAutocomplete: () => false,
      isUserContextMenuCommand: () => false,
      isMessageContextMenuCommand: () => false,
      commandName: "foo",
      replied: false,
      deferred: true,
      editReply: vi.fn(),
    };

    await interactionCreate.execute(interaction);

    expect(interaction.editReply).toHaveBeenCalled();
  });

  it("handles reset-pet button and calls resetAction on good parsing", async () => {
    const buttonInteraction: any = {
      isChatInputCommand: () => false,
      isAutocomplete: () => false,
      isUserContextMenuCommand: () => false,
      isMessageContextMenuCommand: () => false,
      isButton: () => true,
      customId: "reset-pet",
      deferReply: vi.fn().mockResolvedValue(undefined),
      editReply: vi.fn().mockResolvedValue(undefined),
      message: Promise.resolve({ components: [{ components: [null, { content: "first\nSlot: 2\n<@123>" }] }] }),
    };

    await interactionCreate.execute(buttonInteraction);

    expect((resetAction as any)).toHaveBeenCalledWith("pet", buttonInteraction, "123", 2);
    expect(buttonInteraction.editReply).toHaveBeenCalled();
  });

  it("handles reset-pet button with invalid parsing and edits reply with failure", async () => {
    const buttonInteraction: any = {
      isChatInputCommand: () => false,
      isAutocomplete: () => false,
      isUserContextMenuCommand: () => false,
      isMessageContextMenuCommand: () => false,
      isButton: () => true,
      customId: "reset-pet",
      deferReply: vi.fn().mockResolvedValue(undefined),
      editReply: vi.fn().mockResolvedValue(undefined),
      message: Promise.resolve({ components: [{ components: [null, { content: "no-slot-here" }] }] }),
    };

    await interactionCreate.execute(buttonInteraction);

    expect(buttonInteraction.editReply).toHaveBeenCalledWith({ content: "Failed to parse mention or slot number." });
  });

  it("handles reset-bite button and calls resetAction on good parsing", async () => {
    const buttonInteraction: any = {
      isChatInputCommand: () => false,
      isAutocomplete: () => false,
      isUserContextMenuCommand: () => false,
      isMessageContextMenuCommand: () => false,
      isButton: () => true,
      customId: "reset-bite",
      deferReply: vi.fn().mockResolvedValue(undefined),
      editReply: vi.fn().mockResolvedValue(undefined),
      message: Promise.resolve({ components: [{ components: [null, { content: "first\nSlot: 3\n<@789>" }] }] }),
    };

    await interactionCreate.execute(buttonInteraction);

    expect((resetAction as any)).toHaveBeenCalledWith("bite", buttonInteraction, "789", 3);
    expect(buttonInteraction.editReply).toHaveBeenCalled();
  });

  it("returns early when command not found", async () => {
    const client: any = { slashCommands: new Map() };
    const interaction: any = {
      client,
      isChatInputCommand: () => true,
      isAutocomplete: () => false,
      isUserContextMenuCommand: () => false,
      isMessageContextMenuCommand: () => false,
      commandName: "missing",
    };

    await interactionCreate.execute(interaction);

    expect(logger.error).toHaveBeenCalled();
  });
});

describe("interactionCreate routing for custom actions", () => {
  function chatInteraction(overrides: any) {
    return {
      client: { slashCommands: new Map() },
      isAutocomplete: () => false,
      isChatInputCommand: () => true,
      isUserContextMenuCommand: () => false,
      isMessageContextMenuCommand: () => false,
      commandName: "boop",
      ...overrides,
    } as any;
  }

  it("routes an unknown guild command to executeCustomGuildCommand", async () => {
    vi.mocked(executeCustomGuildCommand).mockResolvedValue(true);
    const interaction = chatInteraction({ guildId: "g1" });

    await interactionCreate.execute(interaction);

    expect(executeCustomGuildCommand).toHaveBeenCalledWith(interaction);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it("logs no matching command in DMs", async () => {
    await interactionCreate.execute(chatInteraction({ guildId: null }));

    expect(executeCustomGuildCommand).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(
      { commandName: "boop" },
      "No command matching interaction was found.",
    );
  });

  it("replies ephemerally when a stale guild command has no match", async () => {
    vi.mocked(executeCustomGuildCommand).mockResolvedValue(false);
    const interaction = chatInteraction({ guildId: "g1", reply: vi.fn() });

    await interactionCreate.execute(interaction);

    expect(interaction.reply).toHaveBeenCalledWith({
      content: "That action isn't available here.",
      flags: MessageFlags.Ephemeral,
    });
  });

  it("logs when the guild has no matching custom command", async () => {
    vi.mocked(executeCustomGuildCommand).mockResolvedValue(false);

    await interactionCreate.execute(chatInteraction({ guildId: "g1", reply: vi.fn() }));

    expect(logger.error).toHaveBeenCalledWith(
      { commandName: "boop" },
      "No command matching interaction was found.",
    );
  });

  it("edits the deferred reply when a native guild command fails", async () => {
    vi.mocked(executeCustomGuildCommand).mockRejectedValue(new Error("performAction failed"));
    const interaction = chatInteraction({
      guildId: "g1",
      replied: false,
      deferred: true,
      editReply: vi.fn(),
    });

    await interactionCreate.execute(interaction);

    expect(interaction.editReply).toHaveBeenCalledWith({
      content: "There was an error while executing this command!",
    });
  });

  it("calls autocomplete and swallows its errors", async () => {
    const autocomplete = vi.fn().mockRejectedValue(new Error("boom"));
    const interaction = chatInteraction({
      isAutocomplete: () => true,
      commandName: "action",
      client: { slashCommands: new Map([["action", { autocomplete }]]) },
    });

    await expect(interactionCreate.execute(interaction)).resolves.toBeUndefined();

    expect(autocomplete).toHaveBeenCalledWith(interaction);
    expect(logger.error).toHaveBeenCalled();
  });
});
