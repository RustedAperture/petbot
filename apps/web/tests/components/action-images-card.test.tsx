// @vitest-environment happy-dom
/// <reference lib="dom" />
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

let ownActions: Array<{ name: string; updatedAt: string }> = [];
let statsActions: string[] = [];
const statsCalls = vi.fn();

vi.mock("@/hooks/use-session", () => ({
  useSession: () => ({ session: { guilds: [{ id: "g1", name: "Cafe" }] } }),
}));
vi.mock("@/hooks/use-bot-guilds", () => ({
  useBotGuilds: () => ({ data: ["g1"], isLoading: false }),
}));
vi.mock("@/hooks/use-custom-actions", () => ({
  useCustomActions: () => ({ actions: ownActions }),
}));
vi.mock("@/hooks/use-global-stats", async () => {
  const React = await import("react");
  return {
    useGlobalStats: () => {
      // Snapshot the action list per mount, like a fetch on mount would.
      const [names] = React.useState(() => {
        statsCalls();
        return statsActions;
      });
      return {
        data: {
          totalsByAction: Object.fromEntries(
            names.map((n) => [
              n,
              { totalHasPerformed: 0, totalUsers: 0, imageUrl: null },
            ]),
          ),
        },
        isLoading: false,
        error: null,
        refresh: vi.fn(),
      };
    },
  };
});
vi.mock("@/components/ui/select", () => {
  const Pass = ({ children }: { children?: ReactNode }) => <>{children}</>;
  return {
    Select: Pass,
    SelectContent: Pass,
    SelectGroup: Pass,
    SelectItem: Pass,
    SelectTrigger: Pass,
    SelectValue: Pass,
  };
});
vi.mock("@/components/dialogs/edit-images-dialog", () => ({
  EditImagesDialog: () => null,
}));
vi.mock("@/components/dialogs/image-lightbox", () => ({
  ImageLightbox: () => null,
}));

import ActionImagesCard from "@/components/action-images-card";

afterEach(cleanup);

describe("ActionImagesCard", () => {
  it("reloads the list and marks it yours after you add a custom action", () => {
    ownActions = [];
    statsActions = ["pet"];
    const { rerender } = render(<ActionImagesCard userId="1" />);
    expect(screen.queryByText("Scramble")).toBeNull();

    ownActions = [{ name: "scramble", updatedAt: "t1" }];
    statsActions = ["pet", "scramble"];
    rerender(<ActionImagesCard userId="1" />);

    expect(statsCalls).toHaveBeenCalledTimes(2);
    expect(screen.getByText("Scramble").textContent).toBe("Scramble— yours");
  });
});
