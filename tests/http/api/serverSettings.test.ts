import { describe, it, expect, vi, beforeEach } from "vitest";
import type { IncomingMessage, ServerResponse } from "node:http";
import { Readable } from "stream";

const { selectMock, updateMock, isGuildAdminMock } = vi.hoisted(() => ({
  selectMock: vi.fn(),
  updateMock: vi.fn(),
  isGuildAdminMock: vi.fn(),
}));

vi.mock("../../../src/db/connector.js", () => ({
  drizzleDb: {
    select: selectMock,
    update: updateMock,
  },
}));

vi.mock("../../../src/db/schema.js", () => ({
  botData: {
    guildId: Symbol("guild_id"),
    logChannel: Symbol("log_channel"),
    nickname: Symbol("nickname"),
    sleepImage: Symbol("sleep_image"),
    defaultImages: Symbol("default_images"),
    restricted: Symbol("restricted"),
  },
}));

vi.mock("../../../src/utilities/helper.js", () => ({
  isGuildAdmin: isGuildAdminMock,
}));

vi.mock("../../../src/logger.js", () => ({
  default: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

import logger from "../../../src/logger.js";
import serverSettingsHandler from "../../../src/http/api/serverSettings.js";
import { Client } from "discord.js";

function buildSelectReturn(values: Array<Record<string, unknown>>) {
  return {
    from: () => ({
      where: () => ({
        limit: () => Promise.resolve(values),
      }),
    }),
  };
}

describe("/api/serverSettings handler", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns 405 for unsupported methods", async () => {
    const req = {
      method: "POST",
      url: "/api/serverSettings",
      headers: { host: "localhost" },
    } as Partial<IncomingMessage> as IncomingMessage;
    const res = {
      writeHead: vi.fn(),
      end: vi.fn(),
    } as unknown as ServerResponse;

    await serverSettingsHandler(req, res, {} as Client<boolean>);

    expect(res.writeHead).toHaveBeenCalledWith(405, {
      "Content-Type": "application/json",
    });
    expect(res.end).toHaveBeenCalledWith(
      JSON.stringify({ error: "method_not_allowed" }),
    );
  });

  it("returns 400 when guildId or userId is missing", async () => {
    const req = {
      method: "GET",
      url: "/api/serverSettings?guildId=G1",
      headers: { host: "localhost" },
    } as Partial<IncomingMessage> as IncomingMessage;
    const res = {
      writeHead: vi.fn(),
      end: vi.fn(),
    } as unknown as ServerResponse;

    await serverSettingsHandler(req, res, {} as Client<boolean>);

    expect(res.writeHead).toHaveBeenCalledWith(400, {
      "Content-Type": "application/json",
    });
    expect(res.end).toHaveBeenCalledWith(
      JSON.stringify({ error: "missing parameter: userId" }),
    );
  });

  it("returns 400 when guildId is missing", async () => {
    const req = {
      method: "GET",
      url: "/api/serverSettings?userId=U1",
      headers: { host: "localhost" },
    } as Partial<IncomingMessage> as IncomingMessage;
    const res = {
      writeHead: vi.fn(),
      end: vi.fn(),
    } as unknown as ServerResponse;

    await serverSettingsHandler(req, res, {} as Client<boolean>);

    expect(res.writeHead).toHaveBeenCalledWith(400, {
      "Content-Type": "application/json",
    });
    expect(res.end).toHaveBeenCalledWith(
      JSON.stringify({ error: "missing parameter: guildId" }),
    );
  });

  it("returns 403 when user is not guild admin", async () => {
    isGuildAdminMock.mockResolvedValue(false);

    const req = {
      method: "GET",
      url: "/api/serverSettings?guildId=G1&userId=U1",
      headers: { host: "localhost" },
    } as Partial<IncomingMessage> as IncomingMessage;
    const res = {
      writeHead: vi.fn(),
      end: vi.fn(),
    } as unknown as ServerResponse;

    await serverSettingsHandler(req, res, {} as Client<boolean>);

    expect(isGuildAdminMock).toHaveBeenCalledWith({}, "G1", "U1");
    expect(res.writeHead).toHaveBeenCalledWith(403, {
      "Content-Type": "application/json",
    });
    expect(res.end).toHaveBeenCalledWith(
      JSON.stringify({ error: "forbidden" }),
    );
  });

  it("returns 404 when no settings row exists for guild", async () => {
    isGuildAdminMock.mockResolvedValue(true);

    selectMock.mockReturnValue(buildSelectReturn([]));

    const req = {
      method: "GET",
      url: "/api/serverSettings?guildId=G1&userId=U1",
      headers: { host: "localhost" },
    } as Partial<IncomingMessage> as IncomingMessage;
    const res = {
      writeHead: vi.fn(),
      end: vi.fn(),
    } as unknown as ServerResponse;

    await serverSettingsHandler(req, res, {} as Client<boolean>);

    expect(res.writeHead).toHaveBeenCalledWith(404, {
      "Content-Type": "application/json",
    });
    expect(res.end).toHaveBeenCalledWith(
      JSON.stringify({ error: "not_found" }),
    );
  });

  it("returns 200 and selected settings when guild admin", async () => {
    isGuildAdminMock.mockResolvedValue(true);

    selectMock.mockReturnValue(
      buildSelectReturn([
        {
          logChannel: "C123",
          nickname: "PetBot",
          sleepImage: "http://img",
          defaultImages: { pet: "x" },
          restricted: 1,
        },
      ]),
    );

    const req = {
      method: "GET",
      url: "/api/serverSettings?guildId=G1&userId=U1",
      headers: { host: "localhost" },
    } as Partial<IncomingMessage> as IncomingMessage;
    const res = {
      writeHead: vi.fn(),
      end: vi.fn(),
    } as unknown as ServerResponse;

    await serverSettingsHandler(req, res, {} as Client<boolean>);

    expect(res.writeHead).toHaveBeenCalledWith(200, {
      "Content-Type": "application/json",
    });
    expect(res.end).toHaveBeenCalledWith(
      JSON.stringify({
        settings: {
          logChannel: "C123",
          nickname: "PetBot",
          sleepImage: "http://img",
          defaultImages: { pet: "x" },
          restricted: 1,
        },
      }),
    );
  });

  it("returns 500 on DB error", async () => {
    isGuildAdminMock.mockResolvedValue(true);
    selectMock.mockImplementation(() => {
      throw new Error("db-failure");
    });

    const req = {
      method: "GET",
      url: "/api/serverSettings?guildId=G1&userId=U1",
      headers: { host: "localhost" },
    } as Partial<IncomingMessage> as IncomingMessage;
    const res = {
      writeHead: vi.fn(),
      end: vi.fn(),
    } as unknown as ServerResponse;

    await serverSettingsHandler(req, res, {} as Client<boolean>);

    expect(res.writeHead).toHaveBeenCalledWith(500, {
      "Content-Type": "application/json",
    });
    const endArg = (res.end as unknown as vi.Mock).mock.calls[0][0];
    expect(JSON.parse(endArg)).toMatchObject({
      error: "server_error",
      reason: "fetch_settings_failed",
    });
    const loggerMock = vi.mocked(logger);
    expect(loggerMock.error).toHaveBeenCalledWith(
      expect.objectContaining({ err: expect.any(Error) }),
      "Error fetching server settings rows",
    );
  });

  it("returns 400 for invalid JSON body on PATCH", async () => {
    isGuildAdminMock.mockResolvedValue(true);

    selectMock.mockReturnValue(
      buildSelectReturn([
        {
          logChannel: "C123",
          nickname: "PetBot",
          sleepImage: "http://img",
          defaultImages: { pet: "x" },
          restricted: 1,
        },
      ]),
    );

    const req = new Readable();
    (req as unknown as any).method = "PATCH";
    (req as unknown as any).url = "/api/serverSettings?guildId=G1&userId=U1";
    (req as unknown as any).headers = { host: "localhost" };
    req.push("{ not valid json }");
    req.push(null);

    const res = {
      writeHead: vi.fn(),
      end: vi.fn(),
    } as unknown as ServerResponse;

    await serverSettingsHandler(
      req as unknown as IncomingMessage,
      res,
      {} as Client<boolean>,
    );

    expect(res.writeHead).toHaveBeenCalledWith(400, {
      "Content-Type": "application/json",
    });
    const endArg = (res.end as unknown as vi.Mock).mock.calls[0][0];
    expect(JSON.parse(endArg)).toMatchObject({
      error: "invalid_json",
      reason: "parse_json_failed",
    });
  });

  it("returns 500 when DB update fails in PATCH", async () => {
    isGuildAdminMock.mockResolvedValue(true);

    selectMock.mockReturnValue(
      buildSelectReturn([
        {
          logChannel: "C123",
          nickname: "PetBot",
          sleepImage: "http://img",
          defaultImages: { pet: "x" },
          restricted: 1,
        },
      ]),
    );

    updateMock.mockImplementation(() => ({
      set: () => ({
        where: () => Promise.reject(new Error("update_failure")),
      }),
    }));

    const req = new Readable();
    (req as unknown as any).method = "PATCH";
    (req as unknown as any).url = "/api/serverSettings?guildId=G1&userId=U1";
    (req as unknown as any).headers = { host: "localhost" };
    req.push('{"nickname":"NewName"}');
    req.push(null);

    const res = {
      writeHead: vi.fn(),
      end: vi.fn(),
    } as unknown as ServerResponse;

    await serverSettingsHandler(
      req as unknown as IncomingMessage,
      res,
      {} as Client<boolean>,
    );

    expect(res.writeHead).toHaveBeenCalledWith(500, {
      "Content-Type": "application/json",
    });
    const endArg = (res.end as unknown as vi.Mock).mock.calls[0][0];
    expect(JSON.parse(endArg)).toMatchObject({
      error: "update_failed",
      reason: "db_update_failed",
      details: "update_failure",
    });
  });

  it("returns 400 when PATCH has disallowed keys", async () => {
    isGuildAdminMock.mockResolvedValue(true);

    selectMock.mockReturnValue(
      buildSelectReturn([
        {
          logChannel: "C123",
          nickname: "PetBot",
          sleepImage: "http://img",
          defaultImages: { pet: "x" },
          restricted: 1,
        },
      ]),
    );

    const req = new Readable();
    (req as unknown as any).method = "PATCH";
    (req as unknown as any).url = "/api/serverSettings?guildId=G1&userId=U1";
    (req as unknown as any).headers = { host: "localhost" };
    req.push('{"badField":"nope"}');
    req.push(null);

    const res = {
      writeHead: vi.fn(),
      end: vi.fn(),
    } as unknown as ServerResponse;

    await serverSettingsHandler(
      req as unknown as IncomingMessage,
      res,
      {} as Client<boolean>,
    );

    expect(res.writeHead).toHaveBeenCalledWith(400, {
      "Content-Type": "application/json",
    });
    const invalidEndArg = (res.end as unknown as vi.Mock).mock.calls[0][0];
    expect(JSON.parse(invalidEndArg)).toMatchObject({
      error: "invalid_update_keys",
      reason: "update_keys_not_allowed",
      details: ["badField"],
    });
  });

  it("returns 400 when PATCH body is non-object", async () => {
    isGuildAdminMock.mockResolvedValue(true);

    selectMock.mockReturnValue(
      buildSelectReturn([
        {
          logChannel: "C123",
          nickname: "PetBot",
          sleepImage: "http://img",
          defaultImages: { pet: "x" },
          restricted: 1,
        },
      ]),
    );

    const req = new Readable();
    (req as unknown as any).method = "PATCH";
    (req as unknown as any).url = "/api/serverSettings?guildId=G1&userId=U1";
    (req as unknown as any).headers = { host: "localhost" };
    req.push("[1,2,3]");
    req.push(null);

    const res = {
      writeHead: vi.fn(),
      end: vi.fn(),
    } as unknown as ServerResponse;

    await serverSettingsHandler(
      req as unknown as IncomingMessage,
      res,
      {} as Client<boolean>,
    );

    expect(res.writeHead).toHaveBeenCalledWith(400, {
      "Content-Type": "application/json",
    });
    const errArg = (res.end as unknown as vi.Mock).mock.calls[0][0];
    expect(JSON.parse(errArg)).toMatchObject({
      error: "invalid_payload",
      reason: "body_must_be_object",
    });
  });

  it("returns 200 and updates allowed fields on PATCH", async () => {
    isGuildAdminMock.mockResolvedValue(true);

    selectMock.mockReturnValue(
      buildSelectReturn([
        {
          logChannel: "C123",
          nickname: "PetBot",
          sleepImage: "http://img",
          defaultImages: { pet: "x" },
          restricted: 1,
        },
      ]),
    );

    updateMock.mockImplementation(() => ({
      set: () => ({
        where: () => Promise.resolve(),
      }),
    }));

    const req = new Readable();
    (req as unknown as any).method = "PATCH";
    (req as unknown as any).url = "/api/serverSettings?guildId=G1&userId=U1";
    (req as unknown as any).headers = { host: "localhost" };
    req.push(
      JSON.stringify({
        nickname: "PetBot2",
        restricted: 0,
        logChannel: "C456",
      }),
    );
    req.push(null);

    const res = {
      writeHead: vi.fn(),
      end: vi.fn(),
    } as unknown as ServerResponse;

    await serverSettingsHandler(
      req as unknown as IncomingMessage,
      res,
      {} as Client<boolean>,
    );

    expect(updateMock).toHaveBeenCalled();
    expect(res.writeHead).toHaveBeenCalledWith(200, {
      "Content-Type": "application/json",
    });

    const successBody = JSON.parse(
      (res.end as unknown as vi.Mock).mock.calls[0][0],
    );
    expect(successBody).toMatchObject({
      success: true,
      settings: {
        logChannel: "C456",
        nickname: "PetBot2",
        sleepImage: "http://img",
        defaultImages: { pet: "x" },
        restricted: 0,
      },
    });
    expect(typeof successBody.settings.updatedAt).toBe("string");
  });
});
