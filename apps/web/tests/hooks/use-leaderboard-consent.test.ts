// @vitest-environment happy-dom
/// <reference lib="dom" />
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";

import { useLeaderboardConsent } from "@/hooks/use-leaderboard-consent";

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

describe("useLeaderboardConsent", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("exposes initial state: enabled null, displayName null, hashLabel null, isLoading false", () => {
    const { result, unmount } = renderHook(() => useLeaderboardConsent());
    expect(result.current.enabled).toBeNull();
    expect(result.current.displayName).toBeNull();
    expect(result.current.hashLabel).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    unmount();
  });

  it("fetchStatus: sets enabled true with displayName and hashLabel", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ enabled: true, displayName: "MyName", hashLabel: "User #abc123" }),
      }),
    );

    const { result, unmount } = renderHook(() => useLeaderboardConsent());

    await act(async () => {
      await result.current.fetchStatus();
    });

    expect(result.current.enabled).toBe(true);
    expect(result.current.displayName).toBe("MyName");
    expect(result.current.hashLabel).toBe("User #abc123");
    unmount();
  });

  it("fetchStatus: sets enabled false when server returns no consent", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ enabled: false, displayName: null, hashLabel: "User #def456" }),
      }),
    );

    const { result, unmount } = renderHook(() => useLeaderboardConsent());

    await act(async () => {
      await result.current.fetchStatus();
    });

    expect(result.current.enabled).toBe(false);
    expect(result.current.displayName).toBeNull();
    expect(result.current.hashLabel).toBe("User #def456");
    unmount();
  });

  it("update: sends POST with displayName and sets enabled", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }),
    );

    const { result, unmount } = renderHook(() => useLeaderboardConsent());

    let returnValue = false;
    await act(async () => {
      returnValue = await result.current.update("CoolName");
    });

    expect(returnValue).toBe(true);
    expect(result.current.enabled).toBe(true);
    expect(result.current.displayName).toBe("CoolName");
    expect(fetch).toHaveBeenCalledWith("/api/leaderboard-consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName: "CoolName" }),
    });
    unmount();
  });

  it("disable: sends DELETE and sets enabled false", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }),
    );

    const { result, unmount } = renderHook(() => useLeaderboardConsent());

    let returnValue = false;
    await act(async () => {
      returnValue = await result.current.disable();
    });

    expect(returnValue).toBe(true);
    expect(result.current.enabled).toBe(false);
    expect(result.current.displayName).toBeNull();
    expect(fetch).toHaveBeenCalledWith("/api/leaderboard-consent", { method: "DELETE" });
    unmount();
  });

  it("update: sets error and returns false on failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500, text: async () => "Server Error" }),
    );

    const { result, unmount } = renderHook(() => useLeaderboardConsent());

    let returnValue = true;
    await act(async () => {
      returnValue = await result.current.update("BadName");
    });

    expect(returnValue).toBe(false);
    expect(result.current.error).toBeInstanceOf(Error);
    unmount();
  });

  it("disable: sets error and returns false on failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500, text: async () => "Server Error" }),
    );

    const { result, unmount } = renderHook(() => useLeaderboardConsent());

    let returnValue = true;
    await act(async () => {
      returnValue = await result.current.disable();
    });

    expect(returnValue).toBe(false);
    expect(result.current.error).toBeInstanceOf(Error);
    unmount();
  });
});
