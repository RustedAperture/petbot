import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";

import { useGuildSettings } from "@/hooks/use-guild-settings";

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

describe("useGuildSettings", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches settings with guild/user IDs", async () => {
    const payload = { settings: { logChannel: "123", nickname: "bot" } };
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => payload });
    vi.stubGlobal("fetch", fetchMock);

    const { result, unmount } = renderHook(() =>
      useGuildSettings({
        guildId: "1243425830458359808",
        userId: "561385770724622356",
      }),
    );

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      await Promise.resolve();
    });

    await vi.waitFor(() => {
      expect(result.current.settings).toEqual(payload.settings);
      expect(result.current.isLoading).toBe(false);
    });

    unmount();
  });

  it("does not fetch if required IDs are missing", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const { result, unmount } = renderHook(() =>
      useGuildSettings({ guildId: null, userId: null }),
    );

    expect(result.current.settings).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();

    unmount();
  });
});
