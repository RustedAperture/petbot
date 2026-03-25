// @vitest-environment happy-dom
/// <reference lib="dom" />
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";

import { useOptOut } from "@/hooks/use-opt-out";

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

describe("useOptOut", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("exposes initial state: optedOut null, isLoading false, error null", () => {
    const { result, unmount } = renderHook(() => useOptOut());
    expect(result.current.optedOut).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    unmount();
  });

  it("fetchStatus: sets optedOut true when server returns true", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ optedOut: true }),
      }),
    );

    const { result, unmount } = renderHook(() => useOptOut());

    let returnValue: boolean | null = null;
    await act(async () => {
      returnValue = await result.current.fetchStatus();
    });

    expect(returnValue).toBe(true);
    expect(result.current.optedOut).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    unmount();
  });

  it("fetchStatus: sets optedOut false when server returns false", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ optedOut: false }),
      }),
    );

    const { result, unmount } = renderHook(() => useOptOut());

    await act(async () => {
      await result.current.fetchStatus();
    });

    expect(result.current.optedOut).toBe(false);
    unmount();
  });

  it("fetchStatus: sets error and returns null on non-OK response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => "Internal Server Error",
      }),
    );

    const { result, unmount } = renderHook(() => useOptOut());

    let returnValue: boolean | null = true;
    await act(async () => {
      returnValue = await result.current.fetchStatus();
    });

    expect(returnValue).toBeNull();
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toContain("500");
    expect(result.current.isLoading).toBe(false);
    unmount();
  });

  it("toggle: when optedOut is false, sends POST and flips to true", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ optedOut: false }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);

    const { result, unmount } = renderHook(() => useOptOut());

    // First fetch the status so optedOut is false
    await act(async () => {
      await result.current.fetchStatus();
    });
    expect(result.current.optedOut).toBe(false);

    let returnValue: boolean | null = null;
    await act(async () => {
      returnValue = await result.current.toggle();
    });

    expect(returnValue).toBe(true);
    expect(result.current.optedOut).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith("/api/optout", { method: "POST" });
    unmount();
  });

  it("toggle: when optedOut is true, sends DELETE and flips to false", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ optedOut: true }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);

    const { result, unmount } = renderHook(() => useOptOut());

    await act(async () => {
      await result.current.fetchStatus();
    });
    expect(result.current.optedOut).toBe(true);

    let returnValue: boolean | null = null;
    await act(async () => {
      returnValue = await result.current.toggle();
    });

    expect(returnValue).toBe(false);
    expect(result.current.optedOut).toBe(false);
    expect(fetchMock).toHaveBeenCalledWith("/api/optout", { method: "DELETE" });
    unmount();
  });

  it("toggle: when optedOut is null, fetches status first then sends POST", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ optedOut: false }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);

    const { result, unmount } = renderHook(() => useOptOut());
    expect(result.current.optedOut).toBeNull();

    let returnValue: boolean | null = null;
    await act(async () => {
      returnValue = await result.current.toggle();
    });

    expect(returnValue).toBe(true);
    expect(result.current.optedOut).toBe(true);
    // First call fetches status, second call sends POST
    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/optout");
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/optout", {
      method: "POST",
    });
    unmount();
  });

  it("toggle: when optedOut is null and fetchStatus fails, returns null", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => "error",
      }),
    );

    const { result, unmount } = renderHook(() => useOptOut());

    let returnValue: boolean | null = true;
    await act(async () => {
      returnValue = await result.current.toggle();
    });

    expect(returnValue).toBeNull();
    unmount();
  });

  it("toggle: sets error and returns current on non-OK toggle response", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ optedOut: false }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => "Server Error",
      });
    vi.stubGlobal("fetch", fetchMock);

    const { result, unmount } = renderHook(() => useOptOut());

    await act(async () => {
      await result.current.fetchStatus();
    });

    let returnValue: boolean | null = null;
    await act(async () => {
      returnValue = await result.current.toggle();
    });

    // Returns the current state (false) when toggle fails
    expect(returnValue).toBe(false);
    expect(result.current.optedOut).toBe(false);
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toContain("500");
    unmount();
  });
});
