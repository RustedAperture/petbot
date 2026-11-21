import { act, cleanup, render, screen } from "@testing-library/react";
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import GlobalStatsPage from "@/app/globalStats/page";
import GuildStatsPage from "@/app/guildStats/[guildId]/page";
import DmStatsLocationPage from "@/app/dmStats/[locationId]/page";
import UserStatsPage from "@/app/userStats/page";
import { StatsCardViewProvider } from "@/components/stats/stats-card-view";
import { useGlobalStats } from "@/hooks/use-global-stats";
import { useLiveEvents } from "@/hooks/use-live-events";
import { useSession } from "@/hooks/use-session";
import type { LiveActionEvent } from "@/types/live";

vi.mock("@/hooks/use-global-stats");
vi.mock("@/hooks/use-live-events");
vi.mock("@/hooks/use-session");
vi.mock("@/components/stats/stats-card-simple", () => ({
  default: ({
    statString,
    flashKey,
  }: {
    statString: string;
    flashKey?: number;
  }) => (
    <div data-testid={statString} data-flash-key={flashKey}>
      {statString}
    </div>
  ),
}));
vi.mock("@/hooks/use-bot-guilds", () => ({
  useBotGuilds: () => ({ data: [], isLoading: false }),
}));

let searchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useSearchParams: () => searchParams,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

const stats = {
  totalsByAction: {},
  totalActionsPerformed: 12,
  totalUniqueUsers: 3,
  totalLocations: 2,
};
const refresh = vi.fn();
const applyLiveEvent = vi.fn();

const mockSession = (session: { user: { id: string } } | null) =>
  vi.mocked(useSession).mockReturnValue({
    session: session && {
      user: { id: session.user.id, username: "Tester" },
      guilds: [],
    },
    loading: false,
    refresh: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  });

const withProvider = (node: React.ReactNode) =>
  render(<StatsCardViewProvider>{node}</StatsCardViewProvider>);

const renderGlobal = () => withProvider(<GlobalStatsPage />);

const renderGuild = async (guildId: string) => {
  await act(async () => {
    withProvider(<GuildStatsPage params={Promise.resolve({ guildId })} />);
  });
};

const renderDm = async (
  locationId: string,
  session: { user: { id: string } } | null,
) => {
  mockSession(session);
  await act(async () => {
    withProvider(
      <DmStatsLocationPage params={Promise.resolve({ locationId })} />,
    );
  });
};

const renderUser = (query: Record<string, string>) => {
  searchParams = new URLSearchParams(query);
  return withProvider(<UserStatsPage />);
};

beforeEach(() => {
  vi.clearAllMocks();
  searchParams = new URLSearchParams();
  mockSession({ user: { id: "2" } });
  vi.mocked(useGlobalStats).mockReturnValue({
    data: stats,
    isLoading: false,
    error: null,
    refresh,
    applyLiveEvent,
  });
  vi.mocked(useLiveEvents).mockReturnValue({
    events: [],
    status: "live",
    isLoading: false,
    latestLiveEvent: null,
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(() => new Promise(() => {})),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("live feed wiring", () => {
  it.each([
    ["global", () => renderGlobal(), { kind: "global" }],
    ["guild", () => renderGuild("1"), { kind: "guild", guildId: "1" }],
    [
      "dm",
      () => renderDm("3", { user: { id: "2" } }),
      { kind: "userLocation", userId: "2", locationId: "3" },
    ],
    [
      "user without location",
      () => renderUser({ userId: "2" }),
      { kind: "user", userId: "2" },
    ],
    [
      "user legacy location",
      () => renderUser({ userId: "2", locationId: "3", userScoped: "false" }),
      { kind: "guild", guildId: "3" },
    ],
    [
      "user scoped location",
      () => renderUser({ userId: "2", locationId: "3", userScoped: "true" }),
      { kind: "userLocation", userId: "2", locationId: "3" },
    ],
  ])(
    "%s page subscribes with the right scope",
    async (_name, render, scope) => {
      await render();
      expect(useLiveEvents).toHaveBeenCalledWith(scope, expect.any(Object));
      expect(screen.getByText("Live activity")).toBeTruthy();
    },
  );

  it("dm page stays idle until the session loads", async () => {
    await renderDm("3", null);
    expect(useLiveEvents).toHaveBeenCalledWith(null, expect.any(Object));
  });

  it.each([
    ["global", () => renderGlobal(), "location"],
    ["guild", () => renderGuild("1"), "location"],
    ["dm", () => renderDm("3", { user: { id: "2" } }), "user"],
    ["user", () => renderUser({ userId: "2" }), "user"],
    [
      "user scoped location",
      () => renderUser({ userId: "2", locationId: "3", userScoped: "true" }),
      "user",
    ],
    [
      "user legacy location",
      () => renderUser({ userId: "2", locationId: "3", userScoped: "false" }),
      "location",
    ],
  ])(
    "%s page applies live events in its count mode",
    async (_n, render, mode) => {
      await render();
      const options = vi.mocked(useLiveEvents).mock.calls[0][1];
      const event = { id: 9 } as LiveActionEvent;
      options?.onEvent?.(event);
      expect(applyLiveEvent).toHaveBeenCalledWith(event, mode);
    },
  );

  it.each([
    ["global", () => renderGlobal()],
    ["guild", () => renderGuild("1")],
    ["dm", () => renderDm("3", { user: { id: "2" } })],
    ["user", () => renderUser({ userId: "2" })],
  ])("%s page resyncs stats on reconnect", async (_n, render) => {
    await render();
    vi.mocked(useLiveEvents).mock.calls[0][1]?.onReconnect?.();
    expect(refresh).toHaveBeenCalled();
  });

  it.each([
    ["dm", () => renderDm("3", { user: { id: "2" } }), "performed", "9"],
    ["dm", () => renderDm("3", { user: { id: "2" } }), "received", undefined],
    ["user", () => renderUser({ userId: "2" }), "performed", "9"],
    ["user", () => renderUser({ userId: "2" }), "received", undefined],
    [
      "user legacy location",
      () => renderUser({ userId: "2", locationId: "3", userScoped: "false" }),
      "received",
      "9",
    ],
  ])(
    "%s page performed-total flash for a %s event",
    async (_n, render, role, flashKey) => {
      vi.mocked(useLiveEvents).mockReturnValue({
        events: [],
        status: "live",
        isLoading: false,
        latestLiveEvent: { id: 9, role } as LiveActionEvent,
      });
      await render();
      expect(
        screen
          .getByTestId("Total Actions Performed")
          .getAttribute("data-flash-key") ?? undefined,
      ).toBe(flashKey);
    },
  );
});
