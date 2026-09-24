import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import UserStatsSelector from "@/components/user-stats-selector";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
const guilds = [{ id: "guild-1", name: "Test Guild" }];
const botGuildIds = ["guild-1"];

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams("userId=user-1"),
}));

vi.mock("@/hooks/use-session", () => ({
  useSession: () => ({
    session: {
      user: { id: "user-1", username: "Tester" },
      guilds,
    },
    refresh: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-bot-guilds", () => ({
  useBotGuilds: () => ({ data: botGuildIds, isLoading: false }),
}));

beforeEach(() => {
  push.mockClear();
});

afterEach(cleanup);

it("shows Go only while entering a custom location ID", () => {
  render(<UserStatsSelector />);

  expect(screen.queryByRole("button", { name: "Go" })).not.toBeInTheDocument();

  const scope = screen.getByRole("combobox", { name: "user stats scope" });
  fireEvent.input(scope, { target: { value: "123456789" } });

  const go = screen.getByRole("button", { name: "Go" });
  fireEvent.click(go);
  expect(push).toHaveBeenCalledWith(
    "/userStats?userId=user-1&locationId=123456789&userScoped=true",
  );

  fireEvent.input(scope, { target: { value: "" } });
  expect(screen.queryByRole("button", { name: "Go" })).not.toBeInTheDocument();
});
