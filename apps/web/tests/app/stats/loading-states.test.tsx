import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import GlobalStatsPage from "@/app/globalStats/page";
import UserStatsPage from "@/app/userStats/page";
import { StatsCardViewProvider } from "@/components/stats/stats-card-view";
import { useGlobalStats } from "@/hooks/use-global-stats";
import { useSession } from "@/hooks/use-session";

vi.mock("@/hooks/use-global-stats");
vi.mock("@/hooks/use-session");
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

const stats = {
  totalsByAction: {},
  totalActionsPerformed: 12,
  totalUniqueUsers: 3,
  totalLocations: 2,
};
const refresh = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useSession).mockReturnValue({
    session: { user: { id: "123", username: "Tester" }, guilds: [] },
    loading: false,
    refresh: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  });
  // Leaderboard requests are unrelated to the stats page's request state.
  vi.stubGlobal(
    "fetch",
    vi.fn(() => new Promise(() => {})),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

for (const [name, Page] of [
  ["global", GlobalStatsPage],
  ["user", UserStatsPage],
] as const) {
  describe(`${name} stats request states`, () => {
    const renderPage = () =>
      render(
        <StatsCardViewProvider>
          <Page />
        </StatsCardViewProvider>,
      );

    it("shows an accessible loader instead of an empty state on first load", () => {
      vi.mocked(useGlobalStats).mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        refresh,
      });
      renderPage();
      expect(screen.getByRole("status")).toHaveTextContent(/loading/i);
      expect(screen.queryByText(/no (data|stats)/i)).not.toBeInTheDocument();
    });

    it("shows a retryable error when the first request fails", () => {
      vi.mocked(useGlobalStats).mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error("Failed to fetch stats (500)"),
        refresh,
      });
      renderPage();
      expect(screen.getByRole("alert")).toHaveTextContent(/couldn't load/i);
      fireEvent.click(screen.getByRole("button", { name: /retry/i }));
      expect(refresh).toHaveBeenCalledOnce();
      expect(screen.queryByText(/no (data|stats)/i)).not.toBeInTheDocument();
    });

    it("shows an empty state only after loading finishes without an error", () => {
      vi.mocked(useGlobalStats).mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
        refresh,
      });
      renderPage();
      expect(screen.getByText(/no stats available yet/i)).toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("explains a successful response with no recorded activity", () => {
      vi.mocked(useGlobalStats).mockReturnValue({
        data: {
          totalsByAction: {},
          totalActionsPerformed: 0,
          totalUniqueUsers: 0,
          totalLocations: 0,
        },
        isLoading: false,
        error: null,
        refresh,
      });
      renderPage();
      expect(screen.getByText(/no stats available yet/i)).toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("keeps existing stats visible during a refresh", () => {
      vi.mocked(useGlobalStats).mockReturnValue({
        data: stats,
        isLoading: true,
        error: null,
        refresh,
      });
      renderPage();
      expect(screen.getByText("Total Actions Performed")).toBeInTheDocument();
      expect(screen.getByText(/updating stats/i)).toHaveAttribute(
        "role",
        "status",
      );
    });

    it("keeps existing stats and offers retry if a refresh fails", () => {
      vi.mocked(useGlobalStats).mockReturnValue({
        data: stats,
        isLoading: false,
        error: new Error("Network error"),
        refresh,
      });
      renderPage();
      expect(screen.getByText("Total Actions Performed")).toBeInTheDocument();
      expect(screen.getByRole("alert")).toHaveTextContent(/showing.*previous/i);
      fireEvent.click(screen.getByRole("button", { name: /retry/i }));
      expect(refresh).toHaveBeenCalledOnce();
    });
  });
}

it("waits for the session before fetching personal stats or prompting sign-in", () => {
  vi.mocked(useSession).mockReturnValue({
    ...useSession(),
    session: null,
    loading: true,
  });
  render(<UserStatsPage />);
  expect(screen.getByRole("status")).toHaveTextContent(/loading/i);
  expect(screen.queryByText(/sign in/i)).not.toBeInTheDocument();
  expect(useGlobalStats).not.toHaveBeenCalled();
});

it("prompts signed-out users to sign in without fetching global stats", () => {
  vi.mocked(useSession).mockReturnValue({
    ...useSession(),
    session: null,
    loading: false,
  });
  render(<UserStatsPage />);
  expect(screen.getByText(/sign in to view your stats/i)).toBeInTheDocument();
  expect(useGlobalStats).not.toHaveBeenCalled();
});
