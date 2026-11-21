import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Client } from "discord.js";

const { logger, listCustomActions, listAllCustomActions } = vi.hoisted(() => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  listCustomActions: vi.fn(),
  listAllCustomActions: vi.fn(),
}));

vi.mock("../../../src/logger.js", () => ({ default: logger }));
vi.mock("../../../src/utilities/customActions/store.js", () => ({
  listCustomActions,
  listAllCustomActions,
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
      guilds: { cache: new Set(guildIds) },
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
  it("syncs each distinct guild with guild-scoped actions once", async () => {
    listAllCustomActions.mockResolvedValue([
      action("a", "g1"),
      action("b", "g1"),
      action("c", "g2"),
    ]);
    listCustomActions.mockResolvedValue([]);
    const { client, put } = makeClient(["g1", "g2"]);
    await syncAllGuildCommands(client);
    expect(listAllCustomActions).toHaveBeenCalledWith({ scope: "guild" });
    expect(put).toHaveBeenCalledTimes(2);
  });
});
