// @vitest-environment happy-dom
/// <reference lib="dom" />

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as framerMotion from "framer-motion";
import LiveActivityFeed from "@/components/live-activity-feed";
import StatsCardSimple from "@/components/stats/stats-card-simple";
import type { LiveActionEvent } from "@/types/live";

vi.mock("framer-motion", async (importOriginal) => {
  const actual = await importOriginal<typeof import("framer-motion")>();
  return { ...actual, useReducedMotion: vi.fn(() => false) };
});

const NOW = new Date("2026-11-21T12:00:00Z").getTime();

function ev(id: number, actionType: string, at: number): LiveActionEvent {
  return { id, actionType, createdAt: new Date(at).toISOString() };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  cleanup();
  vi.mocked(framerMotion.useReducedMotion).mockReturnValue(false);
  vi.useRealTimers();
});

describe("LiveActivityFeed", () => {
  it("renders phrases and relative times, newest first", () => {
    render(
      <LiveActivityFeed
        events={[ev(2, "hug", NOW - 12_000), ev(1, "explode", NOW - 90_000)]}
        status="live"
        isLoading={false}
      />,
    );
    expect(screen.getAllByRole("listitem").map((li) => li.textContent)).toEqual([
      "Someone got hugged12s",
      "Someone exploded1m",
    ]);
    expect(screen.getByText("Live")).toBeTruthy();
  });

  it("shows the custom phrase carried by an event", () => {
    render(
      <LiveActivityFeed
        events={[{ ...ev(1, "boop", NOW - 12_000), phrase: "zorped" }]}
        status="live"
        isLoading={false}
      />,
    );
    expect(screen.getByText("Someone got zorped")).toBeTruthy();
  });

  it("shows the empty state copy", () => {
    render(<LiveActivityFeed events={[]} status="live" isLoading={false} />);
    expect(screen.getByText("It's quiet in here")).toBeTruthy();
    expect(screen.getByText("/pet").tagName).toBe("CODE");
    expect(
      screen.getByText(/on someone in Discord and it shows up here straight away\./).textContent,
    ).toBe("Run /pet on someone in Discord and it shows up here straight away.");
  });

  it.each([
    ["live", "Live"],
    ["connecting", "Live"],
    ["reconnecting", "Reconnecting"],
  ] as const)("shows the %s status as %s", (status, label) => {
    render(<LiveActivityFeed events={[]} status={status} isLoading={false} />);
    expect(screen.getByText(label)).toBeTruthy();
  });

  it.each([
    ["live", "Live"],
    ["reconnecting", "Reconnecting"],
  ] as const)("announces %s through a status role", (status, label) => {
    render(<LiveActivityFeed events={[]} status={status} isLoading={false} />);
    expect(screen.getByRole("status").textContent).toBe(label);
  });

  it("pings the live dot only when motion is allowed", () => {
    const { container, rerender } = render(
      <LiveActivityFeed events={[]} status="live" isLoading={false} />,
    );
    expect(container.querySelector(".animate-ping")).not.toBeNull();
    vi.mocked(framerMotion.useReducedMotion).mockReturnValue(true);
    rerender(<LiveActivityFeed events={[]} status="live" isLoading={false} />);
    expect(container.querySelector(".animate-ping")).toBeNull();
  });

  it("does not ping the reconnecting dot", () => {
    const { container } = render(
      <LiveActivityFeed events={[]} status="reconnecting" isLoading={false} />,
    );
    expect(container.querySelector(".animate-ping")).toBeNull();
  });

  it("shows skeletons while loading", () => {
    const { container } = render(<LiveActivityFeed events={[]} status="connecting" isLoading />);
    expect(container.querySelectorAll("[data-slot=skeleton]")).toHaveLength(6);
    expect(screen.queryByText("It's quiet in here")).toBeNull();
  });

  it("re-renders relative times every 10 seconds", () => {
    render(
      <LiveActivityFeed events={[ev(1, "pet", NOW - 12_000)]} status="live" isLoading={false} />,
    );
    expect(screen.getByRole("listitem").textContent).toContain("12s");
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(screen.getByRole("listitem").textContent).toContain("22s");
  });
});

describe("StatsCardSimple flash", () => {
  it("shows +1 only after flashKey changes", () => {
    const { rerender } = render(<StatsCardSimple statString="Pets" value={3} flashKey={5} />);
    expect(screen.queryByText("+1")).toBeNull();
    rerender(<StatsCardSimple statString="Pets" value={4} flashKey={6} />);
    expect(screen.getByText("+1")).toBeTruthy();
    act(() => {
      vi.advanceTimersByTime(1600);
    });
    expect(screen.queryByText("+1")).toBeNull();
  });

  it("hides the +1 when flashKey becomes undefined mid-flash", () => {
    const { rerender } = render(<StatsCardSimple statString="Pets" value={3} flashKey={5} />);
    rerender(<StatsCardSimple statString="Pets" value={4} flashKey={6} />);
    expect(screen.getByText("+1")).toBeTruthy();
    rerender(<StatsCardSimple statString="Pets" value={4} />);
    expect(screen.queryByText("+1")).toBeNull();
  });

  it("restarts the flash when a second key arrives mid-flash", () => {
    const { rerender } = render(<StatsCardSimple statString="Pets" value={3} flashKey={5} />);
    rerender(<StatsCardSimple statString="Pets" value={4} flashKey={6} />);
    const first = screen.getByText("+1");
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    rerender(<StatsCardSimple statString="Pets" value={5} flashKey={7} />);
    expect(screen.getByText("+1")).not.toBe(first);
    act(() => {
      vi.advanceTimersByTime(1400);
    });
    expect(screen.getByText("+1")).toBeTruthy();
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.queryByText("+1")).toBeNull();
  });
});
