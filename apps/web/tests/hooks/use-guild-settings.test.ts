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

  it("update() performs PATCH and updates cache on success", async () => {
    const initial = { settings: { logChannel: "123", nickname: "bot" } };
    const updated = { settings: { logChannel: "123", nickname: "bot2" } };

    const fetchMock = vi.fn((url: string, opts?: any) => {
      if (opts && opts.method === "PATCH") {
        return Promise.resolve({ ok: true, json: async () => updated });
      }
      return Promise.resolve({ ok: true, json: async () => initial });
    });

    vi.stubGlobal("fetch", fetchMock);

    const { result, unmount } = renderHook(() =>
      useGuildSettings({
        guildId: "1243425830458359808",
        userId: "561385770724622356",
      }),
    );

    await act(async () => {
      await Promise.resolve();
    });

    await vi.waitFor(() => {
      expect(result.current.settings).toEqual(initial.settings);
    });

    let ret: any;
    await act(async () => {
      ret = await result.current.update({ nickname: "bot2" });
    });

    expect(fetchMock).toHaveBeenCalled();
    expect(ret).toEqual(updated.settings);

    // SWR cache should be updated to reflect new settings
    await vi.waitFor(() => {
      expect(result.current.settings).toEqual(updated.settings);
    });

    unmount();
  });

  it("update() throws on non-ok PATCH response", async () => {
    const initial = { settings: { logChannel: "123", nickname: "bot" } };

    const fetchMock = vi.fn((url: string, opts?: any) => {
      if (opts && opts.method === "PATCH") {
        return Promise.resolve({
          ok: false,
          status: 500,
          text: async () => "boom",
        });
      }
      return Promise.resolve({ ok: true, json: async () => initial });
    });

    vi.stubGlobal("fetch", fetchMock);

    const { result, unmount } = renderHook(() =>
      useGuildSettings({
        guildId: "1243425830458359808",
        userId: "561385770724622356",
      }),
    );

    await act(async () => {
      await Promise.resolve();
    });

    await vi.waitFor(() => {
      expect(result.current.settings).toEqual(initial.settings);
    });

    await act(async () => {
      await expect(result.current.update({ nickname: "bot3" })).rejects.toThrow(
        /Failed to update server settings/,
      );
    });

    unmount();
  });

  it("update() is a no-op when all fields strip away to empty", async () => {
    const initial = { settings: { logChannel: "123", nickname: "bot" } };

    const fetchMock = vi.fn((url: string, opts?: any) => {
      // Only respond to the initial GET
      if (!opts) {
        return Promise.resolve({ ok: true, json: async () => initial });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    vi.stubGlobal("fetch", fetchMock);

    const { result, unmount } = renderHook(() =>
      useGuildSettings({
        guildId: "1243425830458359808",
        userId: "561385770724622356",
      }),
    );

    await act(async () => {
      await Promise.resolve();
    });

    await vi.waitFor(() => {
      expect(result.current.settings).toEqual(initial.settings);
    });

    // Provide only empty/whitespace values which should be stripped
    let ret: any;
    await act(async () => {
      ret = await result.current.update({
        nickname: "   ",
        defaultImages: {
          pet: "",
          bite: "",
          hug: "",
          bonk: "",
          squish: "",
          explode: "",
        },
      });
    });

    // No PATCH should have been made (only the initial GET)
    expect(fetchMock).toHaveBeenCalledTimes(1);
    // update should return the current data as per implementation
    expect(ret).toEqual(initial);

    unmount();
  });
});
