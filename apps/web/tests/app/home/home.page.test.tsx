import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import Home from "@/app/page";
import { useSession } from "@/hooks/use-session";

vi.mock("@/hooks/use-session");

const sessionState = {
  session: null,
  loading: false,
  refresh: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
};

beforeEach(() => {
  vi.mocked(useSession).mockReturnValue(sessionState);
});

afterEach(() => cleanup());

it("gives guests a visible route to global stats and Discord sign-in", () => {
  render(<Home />);
  expect(
    screen.getByRole("link", { name: /view global stats/i }),
  ).toHaveAttribute("href", "/globalStats");
  expect(
    screen.getByRole("link", { name: /sign in with discord/i }),
  ).toHaveAttribute("href", "/api/auth/discord");
  expect(
    screen.queryByRole("link", { name: /my stats/i }),
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: /how to support petbot/i }),
  ).toBeInTheDocument();
});

it("takes signed-in users directly to their own stats", () => {
  vi.mocked(useSession).mockReturnValue({
    ...sessionState,
    session: { user: { id: "123", username: "Tester" }, guilds: [] },
  });
  render(<Home />);
  expect(screen.getByRole("link", { name: /my stats/i })).toHaveAttribute(
    "href",
    "/userStats",
  );
  expect(
    screen.getByRole("link", { name: /view global stats/i }),
  ).toHaveAttribute("href", "/globalStats");
  expect(
    screen.queryByRole("link", { name: /sign in with discord/i }),
  ).not.toBeInTheDocument();
});

it("keeps sign-in available while checking for a session", () => {
  vi.mocked(useSession).mockReturnValue({ ...sessionState, loading: true });
  render(<Home />);
  expect(
    screen.getByRole("link", { name: /sign in with discord/i }),
  ).toHaveAttribute("href", "/api/auth/discord");
  expect(
    screen.getByRole("link", { name: /view global stats/i }),
  ).toBeInTheDocument();
});
