// @vitest-environment happy-dom
/// <reference lib="dom" />
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";

import { useGlobalStats } from "@/hooks/use-global-stats";

// minimal shape used by the hook; mirrors apps/web/types/stats.ts
interface GlobalStats {
  totalsByAction: Record<
    string,
    {
      totalHasPerformed: number;
      totalUsers: number;
      imageUrl: string;
      images?: string[];
    }
  >;
  totalActionsPerformed: number;
  totalUniqueUsers: number;
  totalLocations: number;
  totalGuilds?: number;
}

function renderHook<T>(hookFn: () => T) {
  const result: { current: T } = { current: null as unknown as T };

  function HookHarness() {
    result.current = hookFn();
    return null;
  }

  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(createElement(HookHarness));
  });

  return {
    result,
    unmount() {
      act(() => root.unmount());
      container.remove();
    },
  };
}

describe("useGlobalStats", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts with loading true and no data when initialData omitted", () => {
    const { result, unmount } = renderHook(() => useGlobalStats());
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
    unmount();
  });

  it("populates `data` with API response, including images property", async () => {
    const fake: GlobalStats = {
      totalsByAction: {
        pet: {
          totalHasPerformed: 1,
          totalUsers: 1,
          imageUrl: "u",
          images: ["i1"],
        },
      },
      totalActionsPerformed: 1,
      totalUniqueUsers: 1,
      totalLocations: 1,
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => fake });
    vi.stubGlobal("fetch", fetchMock);

    const { result, unmount } = renderHook(() => useGlobalStats());

    // initial state should reflect loading and no error
    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBeNull();

    // allow the mount effect (which calls refresh) to run and resolve
    await act(async () => {
      await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenCalled();

    // since refresh() doesn't return a promise, wait for the hook to settle
    await vi.waitFor(() => {
      expect(result.current.data).toEqual(fake);
      expect(result.current.isLoading).toBe(false);
    });

    unmount();
  });

  it("applyLiveEvent is a no-op before data loads and bumps after", async () => {
    let resolveFetch!: (v: unknown) => void;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockReturnValue(new Promise((r) => (resolveFetch = r))),
    );
    const ev = { id: 1, actionType: "pet", createdAt: "2026-01-01T00:00:00Z" };

    const { result, unmount } = renderHook(() => useGlobalStats());
    act(() => result.current.applyLiveEvent(ev, "location"));
    expect(result.current.data).toBeNull();

    await act(async () => {
      resolveFetch({
        ok: true,
        json: async () => ({
          totalsByAction: {
            pet: { totalHasPerformed: 9, totalUsers: 1, imageUrl: "u" },
          },
          totalActionsPerformed: 9,
          totalUniqueUsers: 1,
          totalLocations: 1,
        }),
      });
    });
    await vi.waitFor(() => expect(result.current.data).not.toBeNull());

    act(() => result.current.applyLiveEvent(ev, "location"));
    expect(result.current.data?.totalActionsPerformed).toBe(10);
    unmount();
  });

  describe("refreshing for an unknown live action", () => {
    const loaded = {
      ok: true,
      json: async () => ({
        totalsByAction: {
          pet: { totalHasPerformed: 9, totalUsers: 1, imageUrl: "u" },
        },
        totalActionsPerformed: 9,
        totalUniqueUsers: 1,
        totalLocations: 1,
      }),
    };
    const event = (actionType: string, id = 1) => ({
      id,
      actionType,
      createdAt: "2026-01-01T00:00:00Z",
    });

    async function setup() {
      const fetchMock = vi.fn().mockResolvedValue(loaded);
      vi.stubGlobal("fetch", fetchMock);
      const hook = renderHook(() => useGlobalStats());
      await vi.waitFor(() => expect(hook.result.current.data).not.toBeNull());
      fetchMock.mockClear();
      return { ...hook, fetchMock };
    }

    it("refreshes once for a burst of events with an unknown action", async () => {
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
      const { result, fetchMock, unmount } = await setup();

      act(() => {
        result.current.applyLiveEvent(event("wave", 1), "location");
        result.current.applyLiveEvent(event("wave", 2), "location");
        result.current.applyLiveEvent(event("zap", 3), "location");
      });
      expect(fetchMock).not.toHaveBeenCalled();
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      unmount();
      vi.useRealTimers();
    });

    it("does not refresh for an action that already has a card", async () => {
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
      const { result, fetchMock, unmount } = await setup();

      act(() => result.current.applyLiveEvent(event("pet"), "location"));
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });

      expect(fetchMock).not.toHaveBeenCalled();
      unmount();
      vi.useRealTimers();
    });
  });
});
