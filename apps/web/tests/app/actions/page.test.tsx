// @vitest-environment happy-dom
/// <reference lib="dom" />
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

let ban = { isBanned: false, banReason: null as string | null };

vi.mock("@/hooks/use-session", () => ({
  useSession: () => ({ session: { user: { id: "1" } }, loading: false }),
}));
vi.mock("@/hooks/use-custom-actions", () => ({
  useCustomActions: () => ({ ...ban, isLoading: false }),
}));
vi.mock("@/components/action-images-card", () => ({
  default: () => <section>Your images</section>,
}));
vi.mock("@/components/custom-actions-manager", () => ({
  default: () => null,
}));

import ActionsPage from "@/app/actions/page";

afterEach(cleanup);

describe("ActionsPage", () => {
  it("shows both cards side by side when not banned", () => {
    ban = { isBanned: false, banReason: null };
    const { container } = render(<ActionsPage />);
    expect(screen.getByText("Your custom actions")).toBeTruthy();
    expect(container.querySelector("main")?.className).toContain(
      "xl:grid-cols-2",
    );
  });

  it.each([
    ["spam", ["You can't create custom actions", "spam"]],
    [null, ["You can't create custom actions"]],
  ])(
    "with ban reason %s shows the notice above the images",
    (banReason, notice) => {
      ban = { isBanned: true, banReason };
      const { container } = render(<ActionsPage />);
      expect(screen.queryByText("Your custom actions")).toBeNull();
      const alert = screen.getByRole("alert");
      expect(
        Array.from(alert.children)
          .map((el) => el.textContent)
          .filter(Boolean),
      ).toEqual(notice);
      expect(container.querySelector("main")?.firstElementChild).toBe(alert);
    },
  );
});
