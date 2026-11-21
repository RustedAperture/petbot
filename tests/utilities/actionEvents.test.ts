import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { cpSync, mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { actionEvents } from "../../src/db/schema.js";
import { hashUserId } from "../../src/utilities/crypto.js";

vi.mock("../../src/logger.js", () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

const { db } = vi.hoisted(() => ({ db: { current: null as unknown } }));

vi.mock("../../src/db/connector.js", async () => {
  const { createClient } = await import("@libsql/client");
  const { drizzle } = await import("drizzle-orm/libsql");
  const instance = drizzle({ client: createClient({ url: ":memory:" }) });
  db.current = instance;
  return { drizzleDb: instance, default: instance };
});

import {
  deleteActionEventsForUser,
  listRecentActionEvents,
  matchesActionEventFilter,
  pruneActionEvents,
  recordActionEvent,
  startActionEventPruning,
  toPublicActionEvent,
} from "../../src/utilities/actionEvents.js";
import {
  actionEventListenerCount,
  subscribeActionEvents,
  type ActionEventRow,
} from "../../src/utilities/actionEventBus.js";

const testDb = () => db.current as ReturnType<typeof drizzle>;

const sampleRow: ActionEventRow = {
  id: 1,
  actionType: "hug",
  performerHash: hashUserId("A"),
  targetHash: hashUserId("B"),
  locationId: "g1",
  phrase: null,
  phraseSource: null,
  createdAt: "2026-11-21T00:00:00.000Z",
};

async function seed(
  performer: string,
  target: string,
  locationId: string | null,
  createdAt = new Date().toISOString(),
) {
  await testDb()
    .insert(actionEvents)
    .values({
      actionType: "pet",
      performerHash: hashUserId(performer),
      targetHash: hashUserId(target),
      locationId,
      createdAt,
    });
}

// The baseline migrations in ./drizzle assume an existing database, so a fresh
// one is built from the action_events migration plus the one that adds its phrase column.
beforeAll(async () => {
  const migrationsFolder = mkdtempSync(join(tmpdir(), "action-events-"));
  for (const suffix of ["_action_events", "_custom_actions", "_event_phrase_source"]) {
    const name = readdirSync("drizzle").find((d) => d.endsWith(suffix));
    cpSync(join("drizzle", name!), join(migrationsFolder, name!), {
      recursive: true,
    });
  }
  await migrate(testDb(), { migrationsFolder });
});

beforeEach(async () => {
  await testDb().delete(actionEvents);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("listRecentActionEvents visibility", () => {
  const insert = (
    actionType: string,
    phraseSource: "guild" | "user" | null,
    createdAt: string,
    locationId = "g1",
  ) =>
    testDb().insert(actionEvents).values({
      actionType,
      performerHash: hashUserId("A"),
      targetHash: hashUserId("B"),
      locationId,
      phrase: phraseSource ? "booped" : null,
      phraseSource,
      createdAt,
    });

  it("global feed returns built-ins only", async () => {
    await insert("boop", "guild", "2026-01-02");
    await insert("pet", null, "2026-01-01");
    const rows = await listRecentActionEvents({ visibility: { customNames: new Set() } });
    expect(rows.map((r) => r.actionType)).toEqual(["pet"]);
  });

  it("guild feed excludes personal-phrase events and names the guild no longer defines", async () => {
    await insert("boop", "user", "2026-01-04");
    await insert("zap", "guild", "2026-01-03");
    await insert("boop", "guild", "2026-01-02");
    await insert("pet", null, "2026-01-01");
    const rows = await listRecentActionEvents({
      locationId: "g1",
      visibility: { customNames: new Set(["boop"]) },
    });
    expect(rows.map((r) => [r.actionType, r.phraseSource])).toEqual([
      ["boop", "guild"],
      ["pet", null],
    ]);
  });

  it("applies visibility before the limit", async () => {
    for (let i = 0; i < 50; i++) {
      await insert("boop", "user", `2026-02-01T00:00:${String(i).padStart(2, "0")}Z`);
    }
    await insert("pet", null, "2026-01-01");
    const rows = await listRecentActionEvents({ visibility: { customNames: new Set() } });
    expect(rows.map((r) => r.actionType)).toEqual(["pet"]);
  });

  it("matchesActionEventFilter applies the same rule", () => {
    const row = { ...sampleRow, actionType: "boop", phraseSource: "user" as const };
    const visibility = { customNames: new Set(["boop"]) };
    expect(matchesActionEventFilter(row, { visibility })).toBe(false);
    expect(matchesActionEventFilter({ ...row, phraseSource: "guild" }, { visibility })).toBe(true);
    expect(matchesActionEventFilter({ ...row, actionType: "pet" }, { visibility: { customNames: new Set() } })).toBe(true);
  });
});

describe("recordActionEvent", () => {
  it("keeps delivering and resolves when a subscriber throws", async () => {
    const seen: ActionEventRow[] = [];
    const stopBad = subscribeActionEvents(() => {
      throw new Error("boom");
    });
    const stopGood = subscribeActionEvents((r) => seen.push(r));
    const row = await recordActionEvent({
      actionType: "pet",
      performerId: "1",
      targetId: "2",
      locationId: null,
    });
    stopBad();
    stopGood();
    expect(seen).toEqual([row]);
  });

  it("records hashed ids, never raw ids, and publishes the row", async () => {
    const seen: ActionEventRow[] = [];
    const stop = subscribeActionEvents((r) => seen.push(r));
    const row = await recordActionEvent({
      actionType: "pet",
      performerId: "111",
      targetId: "222",
      locationId: "g1",
    });
    stop();
    expect(row.performerHash).toBe(hashUserId("111"));
    expect(row.targetHash).toBe(hashUserId("222"));
    expect(JSON.stringify(row)).not.toContain("111");
    expect(seen).toEqual([row]);
    expect(actionEventListenerCount()).toBe(0);
  });
});

describe("recordActionEvent phrase", () => {
  it.each([
    ["stores the phrase when given", "booped", "booped"],
    ["stores null when omitted", undefined, null],
  ])("%s", async (_name, phrase, expected) => {
    const row = await recordActionEvent({
      actionType: "boop",
      performerId: "1",
      targetId: "2",
      locationId: "g1",
      ...(phrase ? { phrase } : {}),
    });
    expect(row.phrase).toBe(expected);
  });
});

describe("listRecentActionEvents", () => {
  it("lists newest first, capped, filtered by location AND user", async () => {
    await seed("A", "B", "g1");
    await seed("C", "D", "g1");
    await seed("A", "A", "g2");
    for (let i = 0; i < 60; i++) {
      await seed("X", "Y", "g3");
    }
    expect((await listRecentActionEvents({})).length).toBe(50);
    expect(
      (await listRecentActionEvents({ locationId: "g1" })).map(
        (r) => r.performerHash,
      ),
    ).toEqual([hashUserId("C"), hashUserId("A")]);
    expect((await listRecentActionEvents({ userId: "A" })).length).toBe(2);
    expect(
      (await listRecentActionEvents({ userId: "A", locationId: "g1" })).length,
    ).toBe(1);
  });
});

describe("toPublicActionEvent", () => {
  it.each([
    ["performed", "A", "B", "A"],
    ["received", "B", "A", "A"],
    ["both", "A", "A", "A"],
  ])("role %s", (role, performer, target, viewer) => {
    const row = {
      ...sampleRow,
      performerHash: hashUserId(performer),
      targetHash: hashUserId(target),
    };
    expect(toPublicActionEvent(row, viewer)).toEqual({
      id: 1,
      actionType: "hug",
      createdAt: row.createdAt,
      role,
    });
  });

  it("includes phrase only when the row has one", () => {
    expect(toPublicActionEvent({ ...sampleRow, phrase: "booped" })).toEqual({
      id: 1,
      actionType: "hug",
      createdAt: sampleRow.createdAt,
      phrase: "booped",
    });
    expect(toPublicActionEvent(sampleRow)).not.toHaveProperty("phrase");
  });

  it("without a user omits role, hashes and location", () => {
    expect(Object.keys(toPublicActionEvent(sampleRow))).toEqual([
      "id",
      "actionType",
      "createdAt",
    ]);
  });
});

describe("matchesActionEventFilter", () => {
  it("matches everything with no filter", () => {
    expect(matchesActionEventFilter(sampleRow, {})).toBe(true);
  });

  it("rejects a location mismatch", () => {
    expect(matchesActionEventFilter(sampleRow, { locationId: "g2" })).toBe(
      false,
    );
  });

  it("matches a user who is the target", () => {
    expect(matchesActionEventFilter(sampleRow, { userId: "B" })).toBe(true);
  });

  it("rejects an unrelated user", () => {
    expect(matchesActionEventFilter(sampleRow, { userId: "Z" })).toBe(false);
  });
});

describe("retention and deletion", () => {
  it("prunes rows older than 30 days only", async () => {
    const now = new Date("2026-11-21T00:00:00.000Z");
    const day = 24 * 60 * 60 * 1000;
    await seed(
      "A",
      "B",
      "g1",
      new Date(now.getTime() - 31 * day).toISOString(),
    );
    await seed(
      "A",
      "B",
      "g1",
      new Date(now.getTime() - 29 * day).toISOString(),
    );
    await seed("A", "B", "g1", new Date(now.getTime() - 30 * day).toISOString());
    await pruneActionEvents(now);
    expect((await listRecentActionEvents({})).length).toBe(2);
  });

  it("deleteActionEventsForUser removes rows where the user is performer or target", async () => {
    await seed("A", "B", "g1");
    await seed("C", "A", "g1");
    await seed("C", "D", "g1");
    await deleteActionEventsForUser("A");
    const left = await listRecentActionEvents({});
    expect(left.length).toBe(1);
    expect(left[0].performerHash).toBe(hashUserId("C"));
    expect(left[0].targetHash).toBe(hashUserId("D"));
  });

  it("startActionEventPruning prunes now and stops on request", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    await seed("A", "B", "g1", "2000-01-01T00:00:00.000Z");
    const stop = startActionEventPruning();
    await vi.waitFor(async () => {
      expect((await listRecentActionEvents({})).length).toBe(0);
    });
    expect(vi.getTimerCount()).toBe(1);
    await seed("A", "B", "g1", "2000-01-01T00:00:00.000Z");
    await vi.advanceTimersByTimeAsync(3_600_000);
    await vi.waitFor(async () => {
      expect((await listRecentActionEvents({})).length).toBe(0);
    });
    stop();
    expect(vi.getTimerCount()).toBe(0);
  });
});
