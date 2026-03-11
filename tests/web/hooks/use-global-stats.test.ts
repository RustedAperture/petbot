// @vitest-environment happy-dom
/// <reference lib="dom" />
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";

import { useGlobalStats } from "../../../apps/web/hooks/use-global-stats.js";

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

    // trigger a refresh which performs fetch
    await act(async () => {
      result.current.refresh();
    });

    expect(result.current.data).toEqual(fake);
    expect(fetchMock).toHaveBeenCalled();
    unmount();
  });
});
