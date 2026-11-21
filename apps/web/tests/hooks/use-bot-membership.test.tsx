// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { useBotMembership } from "@/hooks/use-bot-membership";

function renderHook<T>(fn: () => T) {
  const result = { current: null as unknown as T };
  const Harness = () => {
    result.current = fn();
    return null;
  };
  const root = createRoot(document.createElement("div"));
  act(() => root.render(createElement(Harness)));
  return { result, unmount: () => act(() => root.unmount()) };
}

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe("useBotMembership", () => {
  it.each([true, false])("reports isBotMember %s from the relay", async (isBotMember) => {
    fetchMock.mockResolvedValue(
      Response.json({ isBotGuild: true, isBotMember }),
    );
    const { result, unmount } = renderHook(() => useBotMembership("456"));

    await vi.waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isBotMember).toBe(isBotMember);
    expect(String(fetchMock.mock.calls[0][0])).toBe("/api/guilds/bot/456");
    unmount();
  });

  it("treats a failed lookup as unknown, not absent, and retries to success", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    fetchMock
      .mockResolvedValueOnce(new Response("{}", { status: 503 }))
      .mockResolvedValue(Response.json({ isBotGuild: true, isBotMember: true }));
    const { result, unmount } = renderHook(() => useBotMembership("456"));

    await vi.waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.isBotMember).not.toBe(false);
    expect(result.current.isBotMember).toBeNull();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    await vi.waitFor(() => expect(result.current.isBotMember).toBe(true));
    expect(result.current.error).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    unmount();
    vi.useRealTimers();
  });

  it("backs off and stops retrying after unmount", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    fetchMock.mockResolvedValue(new Response("{}", { status: 503 }));
    const { unmount } = renderHook(() => useBotMembership("456"));

    const advance = (ms: number) =>
      act(async () => {
        await vi.advanceTimersByTimeAsync(ms);
      });

    await advance(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await advance(999);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await advance(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await advance(1999);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await advance(1);
    expect(fetchMock).toHaveBeenCalledTimes(3);

    unmount();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    vi.useRealTimers();
  });

  it("does not fetch without a guild id", () => {
    const { result, unmount } = renderHook(() => useBotMembership(null));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current).toEqual({
      isBotMember: false,
      isLoading: false,
      error: null,
    });
    unmount();
  });
});
