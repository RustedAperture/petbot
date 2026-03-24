import { describe, it, expect, vi, beforeEach } from "vitest";
import type { IncomingMessage } from "node:http";
import guildChannelsHandler from "../../../src/http/api/guildChannels.js";

const { isGuildAdminMock } = vi.hoisted(() => ({
  isGuildAdminMock: vi.fn(),
}));

vi.mock("../../../src/utilities/helper.js", () => ({
  isGuildAdmin: isGuildAdminMock,
}));

describe("/api/guildChannels handler", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns 400 when guildId or userId missing", async () => {
    const req = {
      method: "GET",
      url: "/api/guildChannels?guildId=G1",
      headers: { host: "localhost" },
    } as Partial<IncomingMessage> as IncomingMessage;
    const res: any = {
      writeHead: vi.fn(),
      end: vi.fn(),
    };

    await guildChannelsHandler(req, res, {} as any);

    expect(res.writeHead).toHaveBeenCalledWith(400, {
      "Content-Type": "application/json",
    });
    expect(res.end).toHaveBeenCalledWith(
      JSON.stringify({ error: "missing parameter: userId" }),
    );
  });

  it("returns 403 when user is not admin", async () => {
    isGuildAdminMock.mockResolvedValue(false);

    const req = {
      method: "GET",
      url: "/api/guildChannels?guildId=G1&userId=U1",
      headers: { host: "localhost" },
    } as any;
    const res: any = {
      writeHead: vi.fn(),
      end: vi.fn(),
    };

    const client = {
      guilds: {
        fetch: vi.fn(),
      },
    } as any;

    await guildChannelsHandler(req, res, client);

    expect(res.writeHead).toHaveBeenCalledWith(403, {
      "Content-Type": "application/json",
    });
    expect(res.end).toHaveBeenCalledWith(
      JSON.stringify({ error: "forbidden" }),
    );
    expect(client.guilds.fetch).not.toHaveBeenCalled();
  });

  it("returns list of text channels when user is admin via query", async () => {
    isGuildAdminMock.mockResolvedValue(true);
    const guild = {
      channels: {
        fetch: vi.fn().mockResolvedValue(
          new Map([
            ["c1", { id: "c1", name: "general", type: 0 }],
            ["c2", { id: "c2", name: "voice", type: 2 }],
          ]),
        ),
      },
    };

    const req = {
      method: "GET",
      url: "/api/guildChannels?guildId=G1&userId=U1",
      headers: { host: "localhost" },
    } as any;
    const res: any = {
      writeHead: vi.fn(),
      end: vi.fn(),
    };

    const client = {
      guilds: {
        fetch: vi.fn().mockResolvedValue(guild),
      },
    } as any;

    await guildChannelsHandler(req, res, client);

    expect(res.writeHead).toHaveBeenCalledWith(200, {
      "Content-Type": "application/json",
    });
    expect(JSON.parse(res.end.mock.calls[0][0])).toEqual({
      channels: [{ id: "c1", name: "general" }],
    });
  });

  it("returns list of text channels when user is admin via REST path", async () => {
    isGuildAdminMock.mockResolvedValue(true);
    const guild = {
      channels: {
        fetch: vi
          .fn()
          .mockResolvedValue(
            new Map([["c1", { id: "c1", name: "general", type: 0 }]]),
          ),
      },
    };

    const req = {
      method: "GET",
      url: "/api/guildChannels/G1/user/U1",
      headers: { host: "localhost" },
    } as any;
    const res: any = {
      writeHead: vi.fn(),
      end: vi.fn(),
    };

    const client = {
      guilds: {
        fetch: vi.fn().mockResolvedValue(guild),
      },
    } as any;

    await guildChannelsHandler(req, res, client);

    expect(res.writeHead).toHaveBeenCalledWith(200, {
      "Content-Type": "application/json",
    });
    expect(JSON.parse(res.end.mock.calls[0][0])).toEqual({
      channels: [{ id: "c1", name: "general" }],
    });
  });
});
