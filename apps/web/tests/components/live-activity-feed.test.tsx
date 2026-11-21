// @vitest-environment happy-dom
/// <reference lib="dom" />

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import LiveActivityFeed from "@/components/live-activity-feed";
import StatsCardSimple from "@/components/stats/stats-card-simple";
import type { LiveActionEvent } from "@/types/live";

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

  it("shows the empty state copy", () => {
    render(<LiveActivityFeed events={[]} status="live" isLoading={false} />);
    expect(screen.getByText("It's quiet in here")).toBeTruthy();
    expect(
      screen.getByText("Run `/pet` on someone in Discord and it shows up here straight away."),
    ).toBeTruthy();
  });

  it.each([
    ["live", "Live"],
    ["connecting", "Live"],
    ["reconnecting", "Reconnecting"],
  ] as const)("shows the %s status as %s", (status, label) => {
    render(<LiveActivityFeed events={[]} status={status} isLoading={false} />);
    expect(screen.getByText(label)).toBeTruthy();
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
});
