import { describe, it, expect, vi, beforeEach } from "vitest";

const { selectMock, isGuildAdminMock } = vi.hoisted(() => ({
  selectMock: vi.fn(),
  isGuildAdminMock: vi.fn(),
}));

vi.mock("../../../src/db/connector.js", () => ({
  drizzleDb: { select: selectMock },
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

vi.mock("../../../src/logger.js", () => {
  const loggerMock = {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  };
  (globalThis as any).__serverSettingsLoggerMock = loggerMock;
  return { default: loggerMock };
});

import serverSettingsHandler from "../../../src/http/api/serverSettings.js";

function buildSelectReturn(values: any[]) {
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
    const req: any = {
      method: "POST",
      url: "/api/serverSettings",
      headers: { host: "localhost" },
    };
    const res: any = { writeHead: vi.fn(), end: vi.fn() };

    await serverSettingsHandler(req, res, {} as any);

    expect(res.writeHead).toHaveBeenCalledWith(405, {
      "Content-Type": "application/json",
    });
    expect(res.end).toHaveBeenCalledWith(
      JSON.stringify({ error: "method_not_allowed" }),
    );
  });

  it("returns 400 when guildId or userId is missing", async () => {
    const req: any = {
      method: "GET",
      url: "/api/serverSettings?guildId=G1",
      headers: { host: "localhost" },
    };
    const res: any = { writeHead: vi.fn(), end: vi.fn() };

    await serverSettingsHandler(req, res, {} as any);

    expect(res.writeHead).toHaveBeenCalledWith(400, {
      "Content-Type": "application/json",
    });
    expect(res.end).toHaveBeenCalledWith(
      JSON.stringify({ error: "missing parameter: userId" }),
    );
  });

  it("returns 403 when user is not guild admin", async () => {
    isGuildAdminMock.mockResolvedValue(false);

    const req: any = {
      method: "GET",
      url: "/api/serverSettings?guildId=G1&userId=U1",
      headers: { host: "localhost" },
    };
    const res: any = { writeHead: vi.fn(), end: vi.fn() };

    await serverSettingsHandler(req, res, {} as any);

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

    const req: any = {
      method: "GET",
      url: "/api/serverSettings?guildId=G1&userId=U1",
      headers: { host: "localhost" },
    };
    const res: any = { writeHead: vi.fn(), end: vi.fn() };

    await serverSettingsHandler(req, res, {} as any);

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

    const req: any = {
      method: "GET",
      url: "/api/serverSettings?guildId=G1&userId=U1",
      headers: { host: "localhost" },
    };
    const res: any = { writeHead: vi.fn(), end: vi.fn() };

    await serverSettingsHandler(req, res, {} as any);

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

    const req: any = {
      method: "GET",
      url: "/api/serverSettings?guildId=G1&userId=U1",
      headers: { host: "localhost" },
    };
    const res: any = { writeHead: vi.fn(), end: vi.fn() };

    await serverSettingsHandler(req, res, {} as any);

    expect(res.writeHead).toHaveBeenCalledWith(500, {
      "Content-Type": "application/json",
    });
    expect(res.end).toHaveBeenCalledWith(
      expect.stringContaining("server_error"),
    );
    const loggerMock = (globalThis as any).__serverSettingsLoggerMock;
    expect(loggerMock.error).toHaveBeenCalledWith(
      expect.objectContaining({ err: expect.any(Error) }),
      "Error fetching server settings",
    );
  });
});
