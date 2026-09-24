import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useState } from "react";
import { SWRConfig } from "swr";
import Leaderboard from "@/components/leaderboard";

function FilteredLeaderboard({ guild }: { guild: boolean }) {
  const [action, setAction] = useState<string | null>(null);
  return (
    <Leaderboard
      locationId={guild ? "123" : null}
      context={guild ? "guild" : undefined}
      actionType={action}
      onActionTypeChange={setAction}
    />
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it.each([false, true])(
  "selects and clears an action while preserving guild scope (%s)",
  async (guild) => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        const params = new URL(url, "http://localhost").searchParams;
        expect(params.get("locationId")).toBe(guild ? "123" : null);
        expect(params.get("scope")).toBe(guild ? "guild" : null);
        const action = params.get("actionType");
        return {
          ok: true,
          json: async () => ({
            locationId: guild ? "123" : null,
            actionType: action,
            entries: [
              {
                rank: 1,
                displayName: action === "pet" ? "Pet leader" : "Overall leader",
                anonymousLabel: "abc",
                totalActions: 20,
              },
            ],
          }),
        };
      }),
    );
    render(
      <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
        <FilteredLeaderboard guild={guild} />
      </SWRConfig>,
    );
    expect(await screen.findByText("Overall leader")).toBeInTheDocument();
    const select = screen.getByRole("combobox", { name: "Leaderboard action" });
    fireEvent.change(select, { target: { value: "pet" } });
    expect(await screen.findByText("Pet leader")).toBeInTheDocument();
    fireEvent.mouseLeave(select);
    fireEvent.blur(select);
    expect(select).toHaveValue("pet");
    expect(screen.queryByText(/hover an action/i)).not.toBeInTheDocument();
    fireEvent.change(select, { target: { value: "" } });
    expect(await screen.findByText("Overall leader")).toBeInTheDocument();
    expect(select).toHaveValue("");
  },
);
