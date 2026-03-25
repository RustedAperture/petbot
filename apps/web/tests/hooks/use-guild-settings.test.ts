// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock SWR before importing the hook so we control all async behaviour.
// This avoids the happy-dom + React scheduler OOM that occurs when SWR's
// background revalidation timers accumulate inside a DOM environment.
// ---------------------------------------------------------------------------
const mockMutate = vi.fn();
const swrState: {
  data: any;
  error: any;
  isLoading: boolean;
} = { data: undefined, error: undefined, isLoading: false };

vi.mock("swr", () => ({
  default: vi.fn((_key: string | null, _fetcher: any) => ({
    data: swrState.data,
    error: swrState.error,
    isLoading: swrState.isLoading,
    mutate: mockMutate,
  })),
}));

// Mock React hooks used by the module under test so the hook can be
// exercised without a React runtime in the node test environment.
vi.mock("react", () => ({
  useCallback: (fn: any) => fn,
}));

import useSWR from "swr";
import { useGuildSettings } from "@/hooks/use-guild-settings";

const makeId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

describe("useGuildSettings", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    swrState.data = undefined;
    swrState.error = undefined;
    swrState.isLoading = false;
    mockMutate.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns isLoading=true while SWR is loading", () => {
    swrState.isLoading = true;
    swrState.data = undefined;

    const result = useGuildSettings({ guildId: makeId(), userId: makeId() });

    expect(result.isLoading).toBe(true);
    expect(result.settings).toBeNull();
  });

  it("returns settings once SWR resolves data", () => {
    const payload = { settings: { logChannel: "123", nickname: "bot" } };
    swrState.data = payload;
    swrState.isLoading = false;

    const result = useGuildSettings({ guildId: makeId(), userId: makeId() });

    expect(result.settings).toEqual(payload.settings);
    expect(result.isLoading).toBe(false);
  });

  it("does not fetch if required IDs are missing (null key passed to SWR)", () => {
    useGuildSettings({ guildId: null, userId: null });

    // SWR should have been called with null key → no fetch triggered
    expect(vi.mocked(useSWR)).toHaveBeenCalledWith(null, expect.any(Function));
  });

  it("update() performs PATCH and updates cache on success", async () => {
    const initial = { settings: { logChannel: "123", nickname: "bot" } };
    const updated = { settings: { logChannel: "123", nickname: "bot2" } };

    swrState.data = initial;
    swrState.isLoading = false;

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => updated,
    });
    vi.stubGlobal("fetch", fetchMock);
    mockMutate.mockResolvedValue(undefined);

    const result = useGuildSettings({ guildId: makeId(), userId: makeId() });
    const ret = await result.update({ nickname: "bot2" });

    // PATCH should have been called
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("serverSettings"),
      expect.objectContaining({ method: "PATCH" }),
    );

    // mutate should have been called with the updated settings (no revalidation)
    expect(mockMutate).toHaveBeenCalledWith(
      { settings: updated.settings },
      { revalidate: false },
    );

    expect(ret).toEqual(updated.settings);
  });

  it("update() throws on non-ok PATCH response", async () => {
    const initial = { settings: { logChannel: "123", nickname: "bot" } };
    swrState.data = initial;

    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => "boom",
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = useGuildSettings({ guildId: makeId(), userId: makeId() });

    await expect(result.update({ nickname: "bot3" })).rejects.toThrow(
      /Failed to update server settings/,
    );
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("update() sends PATCH when fields are cleared (explicit clears are sent)", async () => {
    const initial = { settings: { logChannel: "123", nickname: "bot" } };
    swrState.data = initial;
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ settings: initial.settings }),
    });
    vi.stubGlobal("fetch", fetchMock);
    mockMutate.mockResolvedValue(undefined);

    const result = useGuildSettings({ guildId: makeId(), userId: makeId() });

    const ret = await result.update({
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

    // PATCH should have been made with explicit clears
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("serverSettings"),
      expect.objectContaining({ method: "PATCH" }),
    );
    expect(mockMutate).toHaveBeenCalledWith(
      { settings: initial.settings },
      { revalidate: false },
    );
    expect(ret).toEqual(initial.settings);
  });
});
