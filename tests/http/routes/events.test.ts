import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import supertest from "supertest";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";

const { listRecent } = vi.hoisted(() => ({ listRecent: vi.fn() }));

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

import { createApp } from "../../../src/http/expressServer.js";
import { formatSseEvent } from "../../../src/http/routes/events.js";
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

      publishActionEvent(rowAt(10, "2"));
      publishActionEvent(rowAt(11, "1"));

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
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

  it("stream rejects requests without the internal secret when one is set", async () => {
    process.env.INTERNAL_API_SECRET = "s";
    await supertest(createApp()).get("/api/events/stream").expect(401);
  });
});
