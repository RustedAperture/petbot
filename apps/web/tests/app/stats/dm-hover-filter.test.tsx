import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import DmStatsLocationPage from "@/app/dmStats/[locationId]/page";
import { StatsCardViewProvider } from "@/components/stats/stats-card-view";
import { useGlobalStats } from "@/hooks/use-global-stats";
import { useLiveEvents } from "@/hooks/use-live-events";
import { useSession } from "@/hooks/use-session";

vi.mock("@/hooks/use-global-stats");
vi.mock("@/hooks/use-live-events");
vi.mock("@/hooks/use-session");
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));
vi.mock("@/components/leaderboard", () => ({
  default: ({ actionType }: { actionType: string | null }) => (
    <div data-testid="leaderboard">{actionType ?? "none"}</div>
  ),
}));
vi.mock("@/components/stats/stats-card", () => ({
  default: ({
    actionName,
    onMouseEnter,
  }: {
    actionName: string;
    onMouseEnter?: () => void;
  }) => (
    <button data-testid={`card-${actionName}`} onMouseEnter={onMouseEnter} />
  ),
}));

const totals = { totalHasPerformed: 1, totalUsers: 1, imageUrl: null };

beforeEach(() => {
  vi.mocked(useSession).mockReturnValue({
    session: { user: { id: "2", username: "T" }, guilds: [] },
    loading: false,
    refresh: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  } as any);
  vi.mocked(useGlobalStats).mockReturnValue({
    data: {
      totalsByAction: { pet: totals, boop: totals },
      totalActionsPerformed: 2,
      totalUniqueUsers: 1,
      totalLocations: 1,
    },
    isLoading: false,
    error: null,
    refresh: vi.fn(),
    applyLiveEvent: vi.fn(),
  } as any);
  vi.mocked(useLiveEvents).mockReturnValue({
    events: [],
    status: "live",
    isLoading: false,
    latestLiveEvent: null,
  } as any);
});
afterEach(cleanup);

async function renderPage() {
  await act(async () => {
    render(
      <StatsCardViewProvider>
        <DmStatsLocationPage params={Promise.resolve({ locationId: "3" })} />
      </StatsCardViewProvider>,
    );
  });
}

it("filters the leaderboard when hovering a built-in card", async () => {
  await renderPage();
  fireEvent.mouseEnter(screen.getByTestId("card-pet"));
  expect(screen.getByTestId("leaderboard").textContent).toBe("pet");
});

it("leaves the overall ranking when hovering a custom card", async () => {
  await renderPage();
  fireEvent.mouseEnter(screen.getByTestId("card-boop"));
  expect(screen.getByTestId("leaderboard").textContent).toBe("none");
});
