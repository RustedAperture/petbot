import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { listMock, logError } = vi.hoisted(() => ({
  listMock: vi.fn(),
  logError: vi.fn(),
}));

vi.mock("../../src/utilities/customActions/store.js", () => ({
  listCustomActions: listMock,
}));
vi.mock("../../src/logger.js", () => ({ default: { error: logError } }));

import { createGuildNameCache } from "../../src/utilities/customActions/guildNameCache.js";

const names = (...list: string[]) => list.map((name) => ({ name }));

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.clearAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("createGuildNameCache", () => {
  it("serves a fresh entry synchronously without another lookup", async () => {
    listMock.mockResolvedValue(names("boop"));
    const cache = createGuildNameCache("g1");
    expect(await cache.hasName("boop")).toBe(true);
    expect(cache.hasName("boop")).toBe(true);
    expect(cache.hasName("zap")).toBe(false);
    expect(listMock).toHaveBeenCalledTimes(1);
  });

  it("shares one in-flight lookup between concurrent callers", async () => {
    listMock.mockResolvedValue(names("boop"));
    const cache = createGuildNameCache("g1");
    const results = await Promise.all(
      Array.from({ length: 100 }, () => cache.hasName("boop")),
    );
    expect(results.every(Boolean)).toBe(true);
    expect(listMock).toHaveBeenCalledTimes(1);
  });

  it("checks an expired entry against a fresh load, not the old names", async () => {
    listMock.mockResolvedValueOnce(names("boop"));
    const cache = createGuildNameCache("g1");
    expect(await cache.hasName("boop")).toBe(true);

    vi.setSystemTime(Date.now() + 11_000);
    listMock.mockResolvedValueOnce([]);
    expect(await cache.hasName("boop")).toBe(false);
  });

  it("fails closed when a load fails and recovers on a later success", async () => {
    listMock.mockResolvedValueOnce(names("boop"));
    const cache = createGuildNameCache("g1");
    expect(await cache.hasName("boop")).toBe(true);

    vi.setSystemTime(Date.now() + 11_000);
    listMock.mockRejectedValueOnce(new Error("db down"));
    expect(await cache.hasName("boop")).toBe(false);
    expect(logError).toHaveBeenCalledTimes(1);
    expect(cache.hasName("boop")).toBe(false);

    vi.setSystemTime(Date.now() + 11_000);
    listMock.mockResolvedValueOnce(names("boop"));
    expect(await cache.hasName("boop")).toBe(true);
  });
});
