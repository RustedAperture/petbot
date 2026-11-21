import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import express from "express";
import supertest from "supertest";
import type { AddressInfo } from "node:net";
import http from "node:http";
import type { Server } from "node:http";

const { listRecent, listGuildActions, hasNameSpy } = vi.hoisted(() => ({
  listRecent: vi.fn(),
  listGuildActions: vi.fn(),
  hasNameSpy: vi.fn(),
}));

vi.mock("../../../src/utilities/customActions/guildNameCache.js", async (importOriginal) => {
  const original = await importOriginal<
    typeof import("../../../src/utilities/customActions/guildNameCache.js")
  >();
  return {
    ...original,
    createGuildNameCache: (guildId: string) => {
      const cache = original.createGuildNameCache(guildId);
      return {
        ...cache,
        hasName: (name: string) => {
          hasNameSpy(name);
          return cache.hasName(name);
        },
      };
    },
  };
});

vi.mock("../../../src/db/connector.js", () => ({ drizzleDb: {} }));
vi.mock("../../../src/logger.js", () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));
vi.mock("../../../src/utilities/actionEvents.js", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("../../../src/utilities/actionEvents.js")
  >()),
  listRecentActionEvents: listRecent,
}));

vi.mock("../../../src/utilities/customActions/store.js", () => ({
  listCustomActions: listGuildActions,
}));

import { createApp } from "../../../src/http/expressServer.js";
import eventsRouter, {
  formatSseEvent,
} from "../../../src/http/routes/events.js";
import {
  publishActionEvent,
  actionEventListenerCount,
  type ActionEventRow,
} from "../../../src/utilities/actionEventBus.js";
import { hashUserId } from "../../../src/utilities/crypto.js";

const rowAt = (id: number, locationId: string): ActionEventRow => ({
  id,
  actionType: "pet",
  performerHash: hashUserId("2"),
  targetHash: hashUserId("3"),
  locationId,
  createdAt: "2026-01-01T00:00:00.000Z",
});

describe("/api/events", () => {
  let server: Server | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    listGuildActions.mockResolvedValue([]);
    delete process.env.INTERNAL_API_SECRET;
  });

  afterEach(async () => {
    delete process.env.INTERNAL_API_SECRET;
    if (server) {
      const closing = server;
      closing.closeAllConnections();
      await new Promise((resolve) => closing.close(resolve));
      server = undefined;
    }
  });

  it("recent passes filters through and returns public events", async () => {
    const row = rowAt(1, "1");
    listRecent.mockResolvedValue([row]);
    const res = await supertest(createApp())
      .get("/api/events/recent?locationId=1&userId=2")
      .expect(200);
    expect(listRecent).toHaveBeenCalledWith({ locationId: "1", userId: "2" });
    expect(res.body).toEqual({
      events: [
        {
          id: 1,
          actionType: "pet",
          createdAt: row.createdAt,
          role: "performed",
        },
      ],
    });
  });

  it("global recent asks for built-ins only", async () => {
    listRecent.mockResolvedValue([]);
    await supertest(createApp()).get("/api/events/recent").expect(200);
    expect(listRecent).toHaveBeenCalledWith({ visibility: { customNames: new Set() } });
  });

  it("guild recent asks for built-ins plus the guild's current actions", async () => {
    listGuildActions.mockResolvedValue([{ name: "boop" }]);
    listRecent.mockResolvedValue([]);
    await supertest(createApp()).get("/api/events/recent?locationId=1").expect(200);
    expect(listGuildActions).toHaveBeenCalledWith("guild", "1");
    expect(listRecent).toHaveBeenCalledWith({
      locationId: "1",
      visibility: { customNames: new Set(["boop"]) },
    });
  });

  it("stream filters custom events by provenance and uses the cached name set", async () => {
    listGuildActions.mockResolvedValue([{ name: "boop" }]);
    server = createApp().listen(0);
    await new Promise((resolve) => server!.once("listening", resolve));
    const { port } = server.address() as AddressInfo;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const custom = (id: number, actionType: string, phraseSource: "guild" | "user") => ({
      ...rowAt(id, "1"),
      actionType,
      phraseSource,
    });
    try {
      const collect = async (query: string, rows: ActionEventRow[], stopAt: string) => {
        const res = await fetch(`http://127.0.0.1:${port}/api/events/stream${query}`, {
          signal: controller.signal,
        });
        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        await reader.read();
        rows.forEach(publishActionEvent);
        let received = "";
        while (!received.includes(stopAt)) {
          const { value, done } = await reader.read();
          if (done) {
            break;
          }
          received += decoder.decode(value);
        }
        await reader.cancel();
        return received;
      };
      const global = await collect(
        "",
        [custom(30, "boop", "guild"), rowAt(31, "1")],
        "id: 31\n",
      );
      expect(global).not.toContain("id: 30\n");

      listGuildActions.mockClear();
      const guild = await collect(
        "?locationId=1",
        [
          custom(40, "boop", "user"),
          custom(41, "zap", "guild"),
          ...Array.from({ length: 100 }, (_, n) => rowAt(100 + n, "1")),
          custom(42, "boop", "guild"),
        ],
        "id: 42\n",
      );
      expect(guild).not.toContain("id: 40\n");
      expect(guild).not.toContain("id: 41\n");
      expect(guild).toContain("id: 100\n");
      expect(listGuildActions).toHaveBeenCalledTimes(1);
    } finally {
      clearTimeout(timeout);
      controller.abort();
    }
  });

  it("delivers a built-in event published while the initial name lookup is pending", async () => {
    listGuildActions.mockReturnValue(new Promise(() => {}));
    server = createApp().listen(0);
    await new Promise((resolve) => server!.once("listening", resolve));
    const { port } = server.address() as AddressInfo;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/events/stream?locationId=1`, {
        signal: controller.signal,
      });
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      expect(decoder.decode((await reader.read()).value)).toBe(": connected\n\n");
      publishActionEvent({ ...rowAt(300, "1"), actionType: "boop", phraseSource: "guild" });
      publishActionEvent(rowAt(301, "1"));
      let received = "";
      while (!received.includes("id: 301\n")) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }
        received += decoder.decode(value);
      }
      expect(received).toContain("id: 301\n");
      expect(received).not.toContain("id: 300\n");
    } finally {
      clearTimeout(timeout);
      controller.abort();
    }
  });

  it("caps custom events waiting on a pending name refresh at 100 per subscriber", async () => {
    let resolveNames!: (names: Array<{ name: string }>) => void;
    listGuildActions.mockReturnValue(
      new Promise((resolve) => {
        resolveNames = resolve;
      }),
    );
    server = createApp().listen(0);
    await new Promise((resolve) => server!.once("listening", resolve));
    const { port } = server.address() as AddressInfo;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/events/stream?locationId=1`, {
        signal: controller.signal,
      });
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      await reader.read();
      for (let n = 0; n < 150; n++) {
        publishActionEvent({ ...rowAt(500 + n, "1"), actionType: "boop", phraseSource: "guild" });
      }
      resolveNames([{ name: "boop" }]);
      await new Promise((resolve) => setTimeout(resolve, 50));
      publishActionEvent(rowAt(900, "1"));
      let received = "";
      while (!received.includes("id: 900\n")) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }
        received += decoder.decode(value);
      }
      const customIds = [...received.matchAll(/^id: (\d+)$/gm)]
        .map((m) => Number(m[1]))
        .filter((id) => id < 900);
      expect(customIds).toHaveLength(100);
      expect(customIds[0]).toBe(500);
      expect(hasNameSpy.mock.calls.length).toBeLessThanOrEqual(100);
    } finally {
      clearTimeout(timeout);
      controller.abort();
    }
  });

  it("a burst of built-in events triggers no name lookups after connecting", async () => {
    listGuildActions.mockResolvedValue([]);
    server = createApp().listen(0);
    await new Promise((resolve) => server!.once("listening", resolve));
    const { port } = server.address() as AddressInfo;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/events/stream?locationId=1`, {
        signal: controller.signal,
      });
      const reader = res.body!.getReader();
      await reader.read();
      expect(listGuildActions).toHaveBeenCalledTimes(1);
      for (let n = 0; n < 100; n++) {
        publishActionEvent(rowAt(200 + n, "1"));
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(listGuildActions).toHaveBeenCalledTimes(1);
    } finally {
      clearTimeout(timeout);
      controller.abort();
    }
  });

  it.each(["locationId=abc", "userId=1;drop", "locationId=1&locationId=2"])(
    "rejects %s with 400",
    async (q) => {
      await supertest(createApp())
        .get(`/api/events/recent?${q}`)
        .expect(400, { error: "invalid_param" });
      await supertest(createApp())
        .get(`/api/events/stream?${q}`)
        .expect(400, { error: "invalid_param" });
    },
  );

  it("formatSseEvent frames id, event and data", () => {
    expect(formatSseEvent({ id: 7, actionType: "hug", createdAt: "t" })).toBe(
      'id: 7\nevent: action\ndata: {"id":7,"actionType":"hug","createdAt":"t"}\n\n',
    );
  });

  it("stream delivers only matching events and unsubscribes on disconnect", async () => {
    server = createApp().listen(0);
    await new Promise((resolve) => server!.once("listening", resolve));
    const { port } = server.address() as AddressInfo;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const res = await fetch(
        `http://127.0.0.1:${port}/api/events/stream?locationId=1`,
        { signal: controller.signal },
      );
      expect(res.headers.get("content-type")).toContain("text/event-stream");
      expect(actionEventListenerCount()).toBe(1);

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      const first = await reader.read();
      expect(decoder.decode(first.value)).toBe(": connected\n\n");

      publishActionEvent(rowAt(10, "2"));
      publishActionEvent(rowAt(11, "1"));

      let received = "";
      while (!received.includes("event: action")) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }
        received += decoder.decode(value);
      }
      expect(received).toContain("id: 11\n");
      expect(received).not.toContain("id: 10\n");
    } finally {
      clearTimeout(timeout);
      controller.abort();
    }

    await vi.waitFor(() => expect(actionEventListenerCount()).toBe(0));
  });

  it("stream stays open and delivers events when the GET carries a JSON body", async () => {
    server = createApp().listen(0);
    await new Promise((resolve) => server!.once("listening", resolve));
    const { port } = server.address() as AddressInfo;

    // fetch refuses a GET body, so use node:http
    const req = http.request({
      port,
      host: "127.0.0.1",
      method: "GET",
      path: "/api/events/stream",
      headers: { "Content-Type": "application/json", "Content-Length": 2 },
    });
    const timeout = setTimeout(() => req.destroy(), 5000);

    try {
      const res = await new Promise<http.IncomingMessage>((resolve, reject) => {
        req.once("response", resolve);
        req.once("error", reject);
        req.end("{}");
      });
      expect(res.statusCode).toBe(200);
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(actionEventListenerCount()).toBe(1);

      publishActionEvent(rowAt(21, "1"));

      let received = "";
      for await (const chunk of res) {
        received += chunk.toString();
        if (received.includes("event: action")) {
          break;
        }
      }
      expect(received).toContain("id: 21\n");
    } finally {
      clearTimeout(timeout);
      req.destroy();
    }

    await vi.waitFor(() => expect(actionEventListenerCount()).toBe(0));
  });

  it("stream stops its producers and never writes again once a write is backpressured", async () => {
    const writeSpy = vi.fn().mockReturnValueOnce(true).mockReturnValue(false);
    const app = express();
    app.use((_req, res, next) => {
      res.write = writeSpy as unknown as typeof res.write;
      next();
    });
    app.use("/api/events", eventsRouter);
    server = app.listen(0);
    await new Promise((resolve) => server!.once("listening", resolve));
    const { port } = server.address() as AddressInfo;

    const req = http.get({
      port,
      host: "127.0.0.1",
      path: "/api/events/stream",
    });
    req.on("error", () => {});
    const timeout = setTimeout(() => req.destroy(), 5000);

    try {
      await new Promise((resolve) => req.once("response", resolve));
      expect(actionEventListenerCount()).toBe(1);

      expect(() => {
        publishActionEvent(rowAt(31, "1"));
        publishActionEvent(rowAt(32, "1"));
      }).not.toThrow();

      expect(actionEventListenerCount()).toBe(0);
      expect(writeSpy).toHaveBeenCalledTimes(2);
    } finally {
      clearTimeout(timeout);
      req.destroy();
    }
  });

  it("stream rejects requests without the internal secret when one is set", async () => {
    process.env.INTERNAL_API_SECRET = "s";
    await supertest(createApp()).get("/api/events/stream").expect(401);
  });
});
