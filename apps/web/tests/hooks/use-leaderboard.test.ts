import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";
import React from "react";

const mockFetch = vi.fn();
global.fetch = mockFetch;

import { useLeaderboard } from "../../hooks/use-leaderboard";

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(
    SWRConfig,
    { value: { dedupingInterval: 0, provider: () => new Map() } },
    children,
  );
}

describe("useLeaderboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null key when locationId is null", () => {
    const { result } = renderHook(
      () => useLeaderboard({ locationId: null }),
      { wrapper },
    );

    expect(result.current.data).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it("fetches and returns leaderboard data", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        locationId: "g1",
        actionType: null,
        entries: [{ rank: 1, userId: "u1", displayName: null, anonymousLabel: "abcd", totalActions: 100 }],
      }),
    });

    const { result } = renderHook(
      () => useLeaderboard({ locationId: "g1" }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data?.entries).toHaveLength(1);
  });

  it("handles fetch errors", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const { result } = renderHook(
      () => useLeaderboard({ locationId: "g1" }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });
  });
});
