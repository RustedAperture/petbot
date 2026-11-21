import { describe, expect, it } from "vitest";
import {
  actionPhrase,
  applyLiveEvent,
  formatRelativeTime,
  liveEventsPath,
} from "@/lib/live-events";
import type { LiveActionEvent, LiveCountMode, LiveScope } from "@/types/live";
import type { GlobalStats } from "@/types/stats";

const NOW = Date.parse("2026-11-21T12:00:00.000Z");

const stats: GlobalStats = {
  totalsByAction: {
    pet: { totalHasPerformed: 5, totalHasReceived: 2, totalUsers: 3, imageUrl: "" },
  },
  totalActionsPerformed: 9,
  totalUniqueUsers: 4,
  totalLocations: 2,
};

describe("live-events", () => {
  it.each([
    [{ kind: "global" }, "/api/events"],
    [{ kind: "guild", guildId: "1" }, "/api/events/guild/1"],
    [{ kind: "user", userId: "2" }, "/api/events/user/2"],
    [{ kind: "userLocation", userId: "2", locationId: "3" }, "/api/events/user/2/location/3"],
    [{ kind: "guild", guildId: "a/b" }, "/api/events/guild/a%2Fb"],
  ])("liveEventsPath %j", (scope, path) => {
    expect(liveEventsPath(scope as LiveScope)).toBe(path);
  });

  it.each([
    ["location", undefined, 1, 1, 1],
    ["location", "received", 1, 1, 1],
    ["user", "performed", 1, 1, 0],
    ["user", "received", 0, 0, 1],
    ["user", "both", 1, 1, 1],
  ])("applyLiveEvent %s/%s", (mode, role, dTotal, dPerf, dRecv) => {
    const event = { id: 1, actionType: "pet", createdAt: "t", role } as LiveActionEvent;
    const next = applyLiveEvent(stats, event, mode as LiveCountMode);
    expect(next.totalActionsPerformed).toBe(9 + dTotal);
    expect(next.totalsByAction.pet.totalHasPerformed).toBe(5 + dPerf);
    expect(next.totalsByAction.pet.totalHasReceived).toBe(2 + dRecv);
    expect(stats.totalActionsPerformed).toBe(9);
    expect(stats.totalsByAction.pet.totalHasPerformed).toBe(5);
  });

  it("applyLiveEvent treats a missing received count as 0", () => {
    const bare: GlobalStats = {
      ...stats,
      totalsByAction: { pet: { totalHasPerformed: 1, totalUsers: 1, imageUrl: "" } },
    };
    const next = applyLiveEvent(
      bare,
      { id: 1, actionType: "pet", createdAt: "t", role: "received" },
      "user",
    );
    expect(next.totalsByAction.pet.totalHasReceived).toBe(1);
  });

  it.each(["boop", "constructor"])(
    "applyLiveEvent with the unknown action %s bumps the total only",
    (actionType) => {
      const next = applyLiveEvent(stats, { id: 1, actionType, createdAt: "t" }, "location");
      expect(next.totalActionsPerformed).toBe(10);
      expect(next.totalsByAction).toEqual(stats.totalsByAction);
    },
  );

  it.each([
    ["user", "performed"],
    ["location", undefined],
  ])("applyLiveEvent leaves an absent received count absent (%s/%s)", (mode, role) => {
    const bare: GlobalStats = {
      ...stats,
      totalsByAction: { pet: { totalHasPerformed: 1, totalUsers: 1, imageUrl: "" } },
    };
    const next = applyLiveEvent(
      bare,
      { id: 1, actionType: "pet", createdAt: "t", role } as LiveActionEvent,
      mode as LiveCountMode,
    );
    expect(next.totalsByAction.pet.totalHasPerformed).toBe(2);
    expect("totalHasReceived" in next.totalsByAction.pet).toBe(false);
  });

  it.each([
    ["pet", "Someone got petted"],
    ["constructor", "Someone got constructored"],
    ["hug", "Someone got hugged"],
    ["bonk", "Someone got bonked"],
    ["bite", "Someone got bitten"],
    ["squish", "Someone got squished"],
    ["explode", "Someone exploded"],
    ["boop", "Someone got booped"],
    ["tease", "Someone got teased"],
  ])("actionPhrase(%s)", (type, phrase) => {
    expect(actionPhrase(type)).toBe(phrase);
  });

  it.each([
    ["boop", "zorped", "Someone got zorped"],
    ["pet", "pawed", "Someone got pawed"],
  ])("actionPhrase(%s, %s) prefers the custom phrase", (type, custom, phrase) => {
    expect(actionPhrase(type, custom)).toBe(phrase);
  });

  it.each([
    [0, "now"],
    [4_000, "now"],
    [5_000, "5s"],
    [12_000, "12s"],
    [90_000, "1m"],
    [7_200_000, "2h"],
    [172_800_000, "2d"],
    [-30_000, "now"],
  ])("formatRelativeTime %d ms ago", (ago, label) => {
    expect(formatRelativeTime(new Date(NOW - ago).toISOString(), new Date(NOW))).toBe(label);
  });
});
