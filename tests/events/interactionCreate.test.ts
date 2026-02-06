import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("../../src/utilities/resetAction", () => ({ resetAction: vi.fn() }));

import interactionCreate from "../../src/events/interactionCreate";
import { resetAction } from "../../src/utilities/resetAction";

beforeEach(() => vi.restoreAllMocks());

describe("interactionCreate", () => {
  it("executes a found chat command", async () => {
    const executed = vi.fn();
    const client: any = { slashCommands: new Map([["foo", { execute: executed }]]) };
    const interaction: any = {
      client,
      isChatInputCommand: () => true,
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
      isUserContextMenuCommand: () => false,
      isMessageContextMenuCommand: () => false,
      isButton: () => true,
      customId: "reset-pet",
      deferReply: vi.fn().mockResolvedValue(undefined),
      editReply: vi.fn().mockResolvedValue(undefined),
      message: Promise.resolve({ components: [ { components: [ null, { content: "first\nSlot: 2\n<@123>" } ] } ] }),
    };

    await interactionCreate.execute(buttonInteraction);

    expect((resetAction as any)).toHaveBeenCalledWith("pet", buttonInteraction, "123", 2);
    expect(buttonInteraction.editReply).toHaveBeenCalled();
  });

  it("handles reset-pet button with invalid parsing and edits reply with failure", async () => {
    const buttonInteraction: any = {
      isChatInputCommand: () => false,
      isUserContextMenuCommand: () => false,
      isMessageContextMenuCommand: () => false,
      isButton: () => true,
      customId: "reset-pet",
      deferReply: vi.fn().mockResolvedValue(undefined),
      editReply: vi.fn().mockResolvedValue(undefined),
      message: Promise.resolve({ components: [ { components: [ null, { content: "no-slot-here" } ] } ] }),
    };

    await interactionCreate.execute(buttonInteraction);

    expect(buttonInteraction.editReply).toHaveBeenCalledWith({ content: "Failed to parse mention or slot number." });
  });

  it("handles reset-bite button and calls resetAction on good parsing", async () => {
    const buttonInteraction: any = {
      isChatInputCommand: () => false,
      isUserContextMenuCommand: () => false,
      isMessageContextMenuCommand: () => false,
      isButton: () => true,
      customId: "reset-bite",
      deferReply: vi.fn().mockResolvedValue(undefined),
      editReply: vi.fn().mockResolvedValue(undefined),
      message: Promise.resolve({ components: [ { components: [ null, { content: "first\nSlot: 3\n<@789>" } ] } ] }),
    };

    await interactionCreate.execute(buttonInteraction);

    expect((resetAction as any)).toHaveBeenCalledWith("bite", buttonInteraction, "789", 3);
    expect(buttonInteraction.editReply).toHaveBeenCalled();
  });

  it("returns early when command not found", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    const client: any = { slashCommands: new Map() };
    const interaction: any = {
      client,
      isChatInputCommand: () => true,
      isUserContextMenuCommand: () => false,
      isMessageContextMenuCommand: () => false,
      commandName: "missing",
    };

    await interactionCreate.execute(interaction);

    expect(console.error).toHaveBeenCalled();
  });
});
