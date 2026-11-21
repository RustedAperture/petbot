import { cleanup, render, screen, within } from "@testing-library/react";
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import UserStatsPage from "@/app/userStats/page";
import { StatsCardViewProvider } from "@/components/stats/stats-card-view";
import { useGlobalStats } from "@/hooks/use-global-stats";
import { useLiveEvents } from "@/hooks/use-live-events";
import { useSession } from "@/hooks/use-session";

let own = { names: ["test"], isBanned: false, isLoading: false };
let preloaded: string[] = [];

vi.mock("@/hooks/use-global-stats");
vi.mock("@/hooks/use-live-events");
vi.mock("@/hooks/use-session");
vi.mock("@/hooks/use-custom-actions", () => ({
  preloadPhrase: (name: string) => preloaded.push(name),
  useCustomActions: () => ({
    actions: own.names.map((name) => ({ name })),
    isBanned: own.isBanned,
    isLoading: own.isLoading,
  }),
}));
vi.mock("@/components/stats/stats-card", () => ({
  default: ({
    actionName,
    onAdopt,
  }: {
    actionName: string;
    onAdopt?: () => void;
  }) => (
    <div data-testid="card">
      {actionName}
      {onAdopt && <button type="button">Adopt {actionName}</button>}
    </div>
  ),
}));
vi.mock("@/components/dialogs/adopt-action-dialog", () => ({
  AdoptActionDialog: () => null,
}));
vi.mock("@/hooks/use-bot-guilds", () => ({
  useBotGuilds: () => ({ data: [], isLoading: false }),
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

const totals = {
  totalHasPerformed: 1,
  totalHasReceived: 0,
  totalUsers: 1,
  imageUrl: null,
};

beforeEach(() => {
  own = { names: ["test"], isBanned: false, isLoading: false };
  preloaded = [];
  vi.mocked(useSession).mockReturnValue({
    session: { user: { id: "1", username: "Tester" }, guilds: [] },
    loading: false,
    refresh: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  } as any);
  vi.mocked(useLiveEvents).mockReturnValue({
    events: [],
    status: "live",
    isLoading: false,
    latestLiveEvent: null,
  } as any);
  vi.mocked(useGlobalStats).mockReturnValue({
    data: {
      totalsByAction: { pet: totals, test: totals, shake: totals },
      totalActionsPerformed: 3,
      totalUniqueUsers: 1,
      totalLocations: 1,
    },
    isLoading: false,
    error: null,
    refresh: vi.fn(),
    applyLiveEvent: vi.fn(),
  });
});
afterEach(cleanup);

const renderPage = () =>
  render(
    <StatsCardViewProvider>
      <UserStatsPage />
    </StatsCardViewProvider>,
  );

function otherSection() {
  return screen.queryByRole("region", { name: "Other custom actions" });
}

describe("user stats split", () => {
  it("lists other people's custom actions apart, with Adopt", () => {
    renderPage();
    const others = within(otherSection()!);
    expect(
      others.getAllByTestId("card").map((c) => c.firstChild?.textContent),
    ).toEqual(["shake"]);
    expect(others.getByRole("button", { name: "Adopt shake" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Adopt test" })).toBeNull();
    expect(preloaded).toEqual(["shake"]);
  });

  it.each([
    ["banned", { isBanned: true, isLoading: false }],
    ["still loading their own actions", { isBanned: false, isLoading: true }],
  ])("shows no Adopt button while %s", (_label, state) => {
    own = { ...own, ...state };
    renderPage();
    expect(screen.queryByRole("button", { name: /Adopt/ })).toBeNull();
    expect(preloaded).toEqual([]);
  });
});
