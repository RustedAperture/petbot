import { vi, describe, it, expect, beforeEach } from "vitest";
import { mockInteraction } from "../helpers/mockInteraction.js";

vi.mock("../../src/db/connector.js", () => {
  const makeResult = (rows: any[]) => ({
    then: (resolve: any) => resolve(rows),
    limit: () => Promise.resolve(rows),
  });
  const select = vi.fn(() => ({
    from: (_table: any) => ({ where: (_cond: any) => makeResult([]) }),
  }));
  const insert = vi.fn(() => ({
    values: vi.fn().mockResolvedValue(undefined),
  }));
  const update = vi.fn(() => ({
    set: vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) })),
  }));
  return { drizzleDb: { select, insert, update } };
});
vi.mock("../../src/db/schema.js", () => ({ botData: {} }));

import { drizzleDb } from "../../src/db/connector.js";
import { command } from "../../src/commands/slash/serverSetup.js";
import { handleServerSetupModal } from "../../src/modals/serverSetupModal.js";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("/setup command", () => {
  it("shows the modal when no guild settings exist", async () => {
    // default mock returns no guild row
    const interaction = mockInteraction({
      options: {
        nickname: "bot",
        default_pet: "http://example/a.png",
        default_bite: null,
        sleep_image: null,
        default_bonk: null,
        default_squish: null,
      },
      fetchMember: { setNickname: vi.fn() },
    });

    await command.execute(interaction as any);

    expect(interaction.__calls.showModals.length).toBe(1);
  });

  it("shows the modal even when a log channel exists", async () => {
    // make select return a bot row with logChannel (camelCase) so the pre-population path is hit
    (drizzleDb as any).select.mockImplementation(() => ({
      from: (_table: any) => ({
        where: (_cond: any) => ({
          then: (r: any) => r({ defaultImages: null, logChannel: "channel-1" }),
          limit: () =>
            Promise.resolve([{ defaultImages: null, logChannel: "channel-1" }]),
        }),
      }),
    }));

    const fakeLog = { id: "channel-1", send: vi.fn() };
    const interaction = mockInteraction({
      options: {
        nickname: null,
        default_pet: null,
        default_bite: null,
        sleep_image: null,
        default_bonk: null,
        default_squish: null,
      },
      fetchChannel: fakeLog,
      fetchMember: { setNickname: vi.fn() },
    });

    await command.execute(interaction as any);

    expect((drizzleDb as any).insert).not.toHaveBeenCalled();
    expect(interaction.__calls.showModals.length).toBe(1);
  });
});

describe("/setup modal submission", () => {
  function mockModal(overrides: any = {}) {
    const calls: any = { editedReplies: [] };

    const guild = overrides.guild ?? {
      id: overrides.guildId ?? "guild-1",
      channels: {
        fetch: async (_id: string) => overrides.fetchChannel ?? null,
      },
      members: {
        fetch: async (_id: string) =>
          overrides.fetchMember ?? { setNickname: async () => {} },
      },
    };

    const client = overrides.client ?? { application: { id: "bot-id" } };

    const fields = {
      getTextInputValue: (key: string) => overrides.fields?.[key] ?? "",
      getSelectedChannels: (key: string) =>
        overrides.selectedChannels?.[key] ?? undefined,
      getStringSelectValues: (key: string) =>
        overrides.stringSelectValues?.[key] ?? undefined,
    };

    return {
      deferReply: async () => {},
      editReply: async (payload: any) => calls.editedReplies.push(payload),
      fields,
      guildId: overrides.guildId ?? "guild-1",
      guild,
      user: { id: "user-1" },
      client,
      __calls: calls,
    };
  }

  it("saves restricted mode when selected", async () => {
    (drizzleDb as any).select.mockImplementation(() => ({
      from: (_table: any) => ({
        where: (_cond: any) => ({
          limit: () =>
            Promise.resolve([
              {
                logChannel: "channel-1",
                nickname: "PetBot",
                sleepImage: "https://example.com/old.png",
                restricted: false,
              },
            ]),
        }),
      }),
    }));

    const fakeChannel = { isTextBased: () => true, send: vi.fn() };
    const fakeMember = { setNickname: vi.fn() };

    const modal = mockModal({
      guildId: "guild-1",
      guild: {
        id: "guild-1",
        channels: { fetch: async () => fakeChannel },
        members: { fetch: async () => fakeMember },
      },
      fields: {
        nicknameInput: "PetBot",
        sleepImageInput: "https://example.com/new.png",
      },
      selectedChannels: { logChannelSelect: ["channel-1"] },
      stringSelectValues: { restrictedSelect: ["true"] },
    });

    await handleServerSetupModal(modal as any);

    const updateResult = (drizzleDb as any).update.mock.results[0].value;
    expect(updateResult.set).toHaveBeenCalledWith(
      expect.objectContaining({
        restricted: true,
      }),
    );
  });
});
