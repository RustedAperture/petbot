// @vitest-environment happy-dom
/// <reference lib="dom" />
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";

import { useDeleteUserSessions } from "@/hooks/use-delete-user-sessions";

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

describe("useDeleteUserSessions", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("exposes initial state: isLoading false, error null", () => {
    const { result, unmount } = renderHook(() => useDeleteUserSessions());
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    unmount();
  });

  it("success path: returns true, resets isLoading, leaves error null", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    const { result, unmount } = renderHook(() => useDeleteUserSessions());

    let returnValue: boolean | undefined;
    await act(async () => {
      returnValue = await result.current.deleteUserSessions("user-123");
    });

    expect(returnValue).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/userSessions?userId=user-123",
      { method: "DELETE" },
    );
    unmount();
  });

  it("non-OK response: returns false and sets error containing status and body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        text: async () => "Not Found",
      }),
    );

    const { result, unmount } = renderHook(() => useDeleteUserSessions());

    let returnValue: boolean | undefined;
    await act(async () => {
      returnValue = await result.current.deleteUserSessions("user-123");
    });

    expect(returnValue).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toContain("404");
    expect(result.current.error?.message).toContain("Not Found");
    unmount();
  });

  it("network error: returns false and surfaces thrown error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Network failure")),
    );

    const { result, unmount } = renderHook(() => useDeleteUserSessions());

    let returnValue: boolean | undefined;
    await act(async () => {
      returnValue = await result.current.deleteUserSessions("user-999");
    });

    expect(returnValue).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe("Network failure");
    unmount();
  });

  it("URL-encodes the userId in the request", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    const { result, unmount } = renderHook(() => useDeleteUserSessions());
    await act(async () => {
      await result.current.deleteUserSessions("user with spaces");
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/userSessions?userId=user%20with%20spaces",
      { method: "DELETE" },
    );
    unmount();
  });

  it("clears a previous error before a subsequent successful call", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => "Server Error",
      })
      .mockResolvedValueOnce({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    const { result, unmount } = renderHook(() => useDeleteUserSessions());

    await act(async () => {
      await result.current.deleteUserSessions("user-123");
    });
    expect(result.current.error).not.toBeNull();

    await act(async () => {
      await result.current.deleteUserSessions("user-123");
    });
    expect(result.current.error).toBeNull();
    unmount();
  });
});
