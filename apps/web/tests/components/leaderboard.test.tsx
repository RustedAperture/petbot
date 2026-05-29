import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { SWRConfig } from "swr";
import React from "react";

// Mock useSession
vi.mock("../../hooks/use-session", () => ({
  useSession: () => ({ session: null }),
}));

global.fetch = vi.fn();

import Leaderboard from "../../components/leaderboard";

function Wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(
    SWRConfig,
    { value: { dedupingInterval: 0, provider: () => new Map() } },
    children,
  );
}

describe("Leaderboard component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows global leaderboard when no locationId", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        locationId: null,
        actionType: null,
        entries: [
          { rank: 1, userId: "u1", displayName: null, anonymousLabel: "abcd", totalActions: 200 },
        ],
      }),
    });

    render(
      React.createElement(Wrapper, null,
        React.createElement(Leaderboard, { locationId: null, actionType: null }),
      ),
    );

    expect(await screen.findByText("User #abcd")).toBeDefined();
    const globalHints = await screen.findAllByText(/global/i);
    expect(globalHints.length).toBeGreaterThanOrEqual(1);
  });

  it("shows empty state when no entries", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ locationId: "g1", actionType: null, entries: [] }),
    });

    render(
      React.createElement(Wrapper, null,
        React.createElement(Leaderboard, { locationId: "g1", actionType: null }),
      ),
    );

    expect(await screen.findByText(/no actions yet/i)).toBeDefined();
  });

  it("renders ranked entries with display names", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        locationId: "g1",
        actionType: null,
        entries: [
          { rank: 1, userId: "u1", displayName: "Alice", anonymousLabel: "abcd", totalActions: 100 },
          { rank: 2, userId: "u2", displayName: null, anonymousLabel: "ef01", totalActions: 50 },
        ],
      }),
    });

    render(
      React.createElement(Wrapper, null,
        React.createElement(Leaderboard, { locationId: "g1", actionType: null }),
      ),
    );

    expect(await screen.findByText("Alice")).toBeDefined();
    expect(await screen.findByText("User #ef01")).toBeDefined();
    expect(await screen.findByText("100")).toBeDefined();
    expect(await screen.findByText("50")).toBeDefined();
  });

  it("shows error state on fetch failure", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    render(
      React.createElement(Wrapper, null,
        React.createElement(Leaderboard, { locationId: "g1", actionType: null }),
      ),
    );

    expect(await screen.findByText(/failed to load/i)).toBeDefined();
  });
});
