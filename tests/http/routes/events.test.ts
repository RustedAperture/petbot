import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import express from "express";
import supertest from "supertest";
import type { AddressInfo } from "node:net";
import http from "node:http";
import type { Server } from "node:http";

const { listRecent, listGuildActions } = vi.hoisted(() => ({
  listRecent: vi.fn(),
  listGuildActions: vi.fn(),
}));

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

  it("global recent omits custom-action events", async () => {
    listRecent.mockResolvedValue([
      { ...rowAt(1, "1"), actionType: "boop" },
      rowAt(2, "1"),
    ]);
    const res = await supertest(createApp()).get("/api/events/recent").expect(200);
    expect(res.body.events.map((e: { id: number }) => e.id)).toEqual([2]);
  });

  it("guild recent includes built-ins and the guild's own actions only", async () => {
    listGuildActions.mockResolvedValue([{ name: "boop" }]);
    listRecent.mockResolvedValue([
      { ...rowAt(1, "1"), actionType: "boop" },
      { ...rowAt(2, "1"), actionType: "zap" },
      rowAt(3, "1"),
    ]);
    const res = await supertest(createApp()).get("/api/events/recent?locationId=1").expect(200);
    expect(res.body.events.map((e: { id: number }) => e.id)).toEqual([1, 3]);
    expect(listGuildActions).toHaveBeenCalledWith("guild", "1");
  });

  it("user recent is unscoped", async () => {
    listRecent.mockResolvedValue([{ ...rowAt(1, "1"), actionType: "zap" }]);
    const res = await supertest(createApp()).get("/api/events/recent?userId=2").expect(200);
    expect(res.body.events).toHaveLength(1);
  });

  it("stream drops custom-action events from the global feed and other guilds' actions from a guild feed", async () => {
    listGuildActions.mockResolvedValue([{ name: "boop" }]);
    server = createApp().listen(0);
    await new Promise((resolve) => server!.once("listening", resolve));
    const { port } = server.address() as AddressInfo;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
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
        [{ ...rowAt(30, "1"), actionType: "boop" }, rowAt(31, "1")],
        "id: 31\n",
      );
      expect(global).not.toContain("id: 30\n");
      const guild = await collect(
        "?locationId=1",
        [
          { ...rowAt(40, "1"), actionType: "zap" },
          { ...rowAt(41, "1"), actionType: "boop" },
        ],
        "id: 41\n",
      );
      expect(guild).not.toContain("id: 40\n");
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
