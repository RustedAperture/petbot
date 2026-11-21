import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Client } from "discord.js";

const { logger, listCustomActions } = vi.hoisted(() => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  listCustomActions: vi.fn(),
}));

vi.mock("../../../src/logger.js", () => ({ default: logger }));
vi.mock("../../../src/utilities/customActions/store.js", () => ({
  listCustomActions,
}));

import {
  buildGuildCommandBodies,
  syncAllGuildCommands,
  syncGuildCommands,
} from "../../../src/utilities/customActions/guildCommandSync.js";
import type { CustomAction } from "../../../src/utilities/customActions/store.js";

const action = (name: string, ownerId = "g1") =>
  ({ name, ownerId, scope: "guild" }) as CustomAction;

function makeClient(guildIds: string[], put = vi.fn().mockResolvedValue([])) {
  return {
    client: {
      guilds: { cache: new Map(guildIds.map((id) => [id, {}])) },
      application: { id: "app1" },
      user: { id: "user1" },
      rest: { put },
    } as unknown as Client,
    put,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("buildGuildCommandBodies", () => {
  it("builds one command per action with a required target option", () => {
    const [body] = buildGuildCommandBodies([action("boop")]);
    expect(body.name).toBe("boop");
    expect(body.description).toBe("Use the server's boop action");
    expect(body.options).toEqual([
      expect.objectContaining({
        name: "target",
        description: "Who to boop",
        required: true,
      }),
    ]);
  });
});

describe("syncGuildCommands", () => {
  it("makes no REST call for a guild the bot is not in", async () => {
    const { client, put } = makeClient([]);
    expect(await syncGuildCommands(client, "g1")).toBe(false);
    expect(put).not.toHaveBeenCalled();
  });

  it("puts the guild's bodies to the guild commands route", async () => {
    listCustomActions.mockResolvedValue([action("boop")]);
    const { client, put } = makeClient(["g1"]);
    expect(await syncGuildCommands(client, "g1")).toBe(true);
    expect(put).toHaveBeenCalledWith("/applications/app1/guilds/g1/commands", {
      body: [expect.objectContaining({ name: "boop" })],
    });
  });

  it("puts an empty list when the last action was removed", async () => {
    listCustomActions.mockResolvedValue([]);
    const { client, put } = makeClient(["g1"]);
    expect(await syncGuildCommands(client, "g1")).toBe(true);
    expect(put).toHaveBeenCalledWith(expect.any(String), { body: [] });
  });

  it("resolves false and logs an error when Discord rejects", async () => {
    listCustomActions.mockResolvedValue([action("boop")]);
    const { client } = makeClient(
      ["g1"],
      vi.fn().mockRejectedValue(new Error("boom")),
    );
    expect(await syncGuildCommands(client, "g1")).toBe(false);
    expect(logger.error).toHaveBeenCalled();
  });

  it("returns false when no application id is available", async () => {
    const { client, put } = makeClient(["g1"]);
    (client as any).application = null;
    (client as any).user = null;
    expect(await syncGuildCommands(client, "g1")).toBe(false);
    expect(put).not.toHaveBeenCalled();
  });
});

describe("syncAllGuildCommands", () => {
  it("overwrites every cached guild, using an empty list when it has no actions", async () => {
    listCustomActions.mockImplementation(async (_scope, id) =>
      id === "g1" ? [action("boop")] : [],
    );
    const { client, put } = makeClient(["g1", "g2"]);
    await syncAllGuildCommands(client);
    expect(put).toHaveBeenCalledTimes(2);
    expect(put).toHaveBeenCalledWith("/applications/app1/guilds/g1/commands", {
      body: [expect.objectContaining({ name: "boop" })],
    });
    expect(put).toHaveBeenCalledWith("/applications/app1/guilds/g2/commands", {
      body: [],
    });
  });

  it("runs guild syncs one at a time", async () => {
    listCustomActions.mockResolvedValue([]);
    let releaseFirst!: () => void;
    const put = vi
      .fn()
      .mockImplementationOnce(
        () => new Promise<void>((resolve) => (releaseFirst = resolve)),
      )
      .mockResolvedValue([]);
    const { client } = makeClient(["g1", "g2"], put);
    const done = syncAllGuildCommands(client);
    await vi.waitFor(() => expect(put).toHaveBeenCalledTimes(1));
    await new Promise((r) => setTimeout(r, 10));
    expect(put).toHaveBeenCalledTimes(1);
    releaseFirst();
    await done;
    expect(put.mock.calls.map((c) => c[0])).toEqual([
      "/applications/app1/guilds/g1/commands",
      "/applications/app1/guilds/g2/commands",
    ]);
  });
});

describe("overlapping syncs for one guild", () => {
  it("reads current state when each queued sync gets its turn", async () => {
    listCustomActions
      .mockResolvedValueOnce([action("boop")])
      .mockResolvedValueOnce([action("boop"), action("hug")]);
    let releaseFirst!: () => void;
    const put = vi
      .fn()
      .mockImplementationOnce(
        () => new Promise<void>((resolve) => (releaseFirst = resolve)),
      )
      .mockResolvedValue([]);
    const { client } = makeClient(["g1"], put);
    const first = syncGuildCommands(client, "g1");
    const second = syncGuildCommands(client, "g1");
    await vi.waitFor(() => expect(put).toHaveBeenCalledTimes(1));
    expect(listCustomActions).toHaveBeenCalledTimes(1);
    releaseFirst();
    await Promise.all([first, second]);
    expect(put).toHaveBeenCalledTimes(2);
    expect(put.mock.calls[1][1].body.map((b: { name: string }) => b.name)).toEqual([
      "boop",
      "hug",
    ]);
  });
});
