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

  it("treats a failed lookup as not a member", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 503 }));
    const { result, unmount } = renderHook(() => useBotMembership("456"));

    await vi.waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isBotMember).toBe(false);
    unmount();
  });

  it("does not fetch without a guild id", () => {
    const { result, unmount } = renderHook(() => useBotMembership(null));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current).toEqual({ isBotMember: false, isLoading: false });
    unmount();
  });
});
