// @vitest-environment happy-dom
/// <reference lib="dom" />
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SWRConfig } from "swr";

let session: { user: { id: string } } | null = null;
vi.mock("@/hooks/use-session", () => ({
  useSession: () => ({ session, loading: false }),
}));

import OwnerPage from "@/app/owner/page";

const action = {
  id: 7,
  name: "boop",
  phrase: "booped",
  scope: "guild",
  ownerId: "900",
  createdBy: "111",
  createdAt: "2026-01-02T00:00:00.000Z",
};

function json(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200 });
}

afterEach(cleanup);

describe("OwnerPage sign-out", () => {
  it("drops the moderation view when the session ends", async () => {
    let isOwnerNow = true;
    (global as any).fetch = vi.fn(async (url: string) => {
      if (url === "/api/owner/me") {
        return json({ isOwner: isOwnerNow });
      }
      return json(url.includes("bans") ? { bans: [] } : { actions: [action] });
    });
    const cache = new Map();
    const ui = () => (
      <SWRConfig value={{ provider: () => cache, dedupingInterval: 0 }}>
        <OwnerPage />
      </SWRConfig>
    );

    session = { user: { id: "111" } };
    const view = render(ui());
    expect(await screen.findByText("booped")).toBeTruthy();

    session = null;
    isOwnerNow = false;
    view.rerender(ui());

    expect(
      await screen.findByText("You don't have access to this page."),
    ).toBeTruthy();
    expect(screen.queryByText("booped")).toBeNull();
  });
});
