import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import StatsCardView, {
  StatsCardViewProvider,
  StatsCardViewToggle,
} from "@/components/stats/stats-card-view";

function setViewportMatches(initiallyMobile: boolean) {
  let mobile = initiallyMobile;
  const listeners = new Set<() => void>();

  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      get matches() {
        return mobile;
      },
      addEventListener: (_event: string, listener: () => void) =>
        listeners.add(listener),
      removeEventListener: (_event: string, listener: () => void) =>
        listeners.delete(listener),
    })),
  );

  return (nextMobile: boolean) => {
    mobile = nextMobile;
    listeners.forEach((listener) => listener());
  };
}

beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function renderCardView() {
  return render(
    <StatsCardViewProvider>
      <header>
        <StatsCardViewToggle />
      </header>
      <main>
        <StatsCardView>
          {(compact) => <p>{compact ? "Compact cards" : "Full cards"}</p>}
        </StatsCardView>
      </main>
    </StatsCardViewProvider>,
  );
}

describe("StatsCardView", () => {
  it("starts compact on mobile and lets the user show full cards", () => {
    setViewportMatches(true);
    renderCardView();

    expect(screen.getByRole("banner")).toContainElement(
      screen.getByRole("group", { name: "Card view" }),
    );
    expect(
      screen.getByRole("region", { name: "Action cards" }),
    ).not.toContainElement(screen.getByRole("group", { name: "Card view" }));
    expect(screen.getByText("Compact cards")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /compact cards/i }),
    ).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: /full cards/i }));
    expect(screen.getByText("Full cards")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /full cards/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("keeps phone and desktop choices separate", () => {
    const resize = setViewportMatches(false);
    renderCardView();

    expect(screen.getByText("Full cards")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /compact cards/i }));
    expect(screen.getByText("Compact cards")).toBeInTheDocument();
    act(() => resize(true));
    expect(screen.getByText("Compact cards")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /full cards/i }));
    expect(screen.getByText("Full cards")).toBeInTheDocument();
    act(() => resize(false));
    expect(screen.getByText("Compact cards")).toBeInTheDocument();
    act(() => resize(true));
    expect(screen.getByText("Full cards")).toBeInTheDocument();
  });

  it("restores an explicit desktop choice when the provider remounts", () => {
    setViewportMatches(false);
    const first = renderCardView();

    fireEvent.click(screen.getByRole("button", { name: /compact cards/i }));
    expect(screen.getByText("Compact cards")).toBeInTheDocument();

    first.unmount();
    renderCardView();
    expect(screen.getByText("Compact cards")).toBeInTheDocument();
  });

  it("restores an explicit phone choice when the provider remounts", () => {
    setViewportMatches(true);
    const first = renderCardView();

    fireEvent.click(screen.getByRole("button", { name: /full cards/i }));
    expect(screen.getByText("Full cards")).toBeInTheDocument();

    first.unmount();
    renderCardView();
    expect(screen.getByText("Full cards")).toBeInTheDocument();
  });

  it("still changes view when local storage is unavailable", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("Storage unavailable");
      },
      setItem: () => {
        throw new Error("Storage unavailable");
      },
    });
    setViewportMatches(false);
    renderCardView();

    fireEvent.click(screen.getByRole("button", { name: /compact cards/i }));
    expect(screen.getByText("Compact cards")).toBeInTheDocument();
  });
});
