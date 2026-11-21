// @vitest-environment happy-dom
/// <reference lib="dom" />
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const owner = { isOwner: true, isLoading: false };
let ownerState = owner;
vi.mock("@/hooks/use-is-owner", () => ({ useIsOwner: () => ownerState }));

import { SWRConfig } from "swr";
import OwnerPage from "@/app/owner/page";

function renderPage() {
  const ui = () => (
    <SWRConfig value={{ provider: () => cache, dedupingInterval: 0 }}>
      <OwnerPage />
    </SWRConfig>
  );
  const view = render(ui());
  return { ...view, rerender: () => view.rerender(ui()) };
}
let cache = new Map();

const action = {
  id: 7,
  name: "boop",
  phrase: "booped",
  scope: "guild",
  ownerId: "900",
  image: "https://x.io/a.png",
  createdBy: "111",
  createdAt: "2026-01-02T00:00:00.000Z",
  updatedAt: "",
};

let mockFetch: ReturnType<typeof vi.fn>;
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}
beforeEach(() => {
  cache = new Map();
  ownerState = owner;
  mockFetch = vi.fn(async (url: string, init?: RequestInit) => {
    if (url.startsWith("/api/owner/customActions") && !init?.method) {
      return json({ actions: [action] });
    }
    if (url === "/api/owner/bans" && !init?.method) {
      return json({ bans: [{ userId: "555", createdAt: "" }] });
    }
    return json({ ok: true });
  });
  (global as any).fetch = mockFetch;
});
afterEach(cleanup);

describe("OwnerPage", () => {
  it("shows only the access message to a non-owner", () => {
    ownerState = { isOwner: false, isLoading: false };
    renderPage();
    expect(
      screen.getByText("You don't have access to this page."),
    ).toBeTruthy();
    expect(screen.queryByText("Banned creators")).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("lists actions and bans for the owner", async () => {
    renderPage();
    expect(await screen.findByText("booped")).toBeTruthy();
    expect(screen.getByText("900")).toBeTruthy();
    expect(await screen.findByText("555")).toBeTruthy();
  });

  it("sends the filter as name", async () => {
    renderPage();
    await screen.findByText("booped");
    fireEvent.change(screen.getByLabelText("Filter by name"), {
      target: { value: "boop" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Filter" }));
    await waitFor(() =>
      expect(
        mockFetch.mock.calls.some(([u]) =>
          String(u).includes("/api/owner/customActions?name=boop"),
        ),
      ).toBe(true),
    );
  });

  it("bans a user id", async () => {
    renderPage();
    await screen.findByText("555");
    fireEvent.change(screen.getByLabelText("User ID"), {
      target: { value: "777777777777777777" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Ban" }));
    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/owner/bans/777777777777777777",
        expect.objectContaining({ method: "PUT" }),
      ),
    );
  });

  it("rejects an invalid user id without a request", async () => {
    renderPage();
    await screen.findByText("555");
    fireEvent.change(screen.getByLabelText("User ID"), {
      target: { value: "777" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Ban" }));
    expect(
      await screen.findByText("Enter a valid Discord user ID."),
    ).toBeTruthy();
    expect(mockFetch.mock.calls.some(([, i]) => i?.method === "PUT")).toBe(
      false,
    );
  });

  it("sends name, scope and owner filters", async () => {
    renderPage();
    await screen.findByText("booped");
    fireEvent.change(screen.getByLabelText("Filter by name"), {
      target: { value: "boop" },
    });
    fireEvent.change(screen.getByLabelText("Scope"), {
      target: { value: "guild" },
    });
    fireEvent.change(screen.getByLabelText("Owner ID"), {
      target: { value: "900" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Filter" }));
    await waitFor(() =>
      expect(
        mockFetch.mock.calls.some(
          ([u]) =>
            String(u) ===
            "/api/owner/customActions?name=boop&scope=guild&ownerId=900",
        ),
      ).toBe(true),
    );
  });

  it("sends one DELETE when the confirm is pressed twice", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Delete boop" }));
    const confirm = await screen.findByRole("button", { name: "Delete" });
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    await waitFor(() =>
      expect(
        mockFetch.mock.calls.filter(([, i]) => i?.method === "DELETE"),
      ).toHaveLength(1),
    );
  });

  it("unbans a user", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Unban 555" }));
    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/owner/bans/555",
        expect.objectContaining({ method: "DELETE" }),
      ),
    );
  });

  it("confirms before deleting an action", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Delete boop" }));
    expect(await screen.findByText(/This can't be undone/)).toBeTruthy();
    expect(
      mockFetch.mock.calls.some(([, init]) => init?.method === "DELETE"),
    ).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/owner/customActions/7",
        expect.objectContaining({ method: "DELETE" }),
      ),
    );
  });

  it("shows API errors inline", async () => {
    mockFetch.mockImplementation(async (url: string, init?: RequestInit) =>
      init?.method === "PUT"
        ? json({ error: "nope" }, 500)
        : json({ bans: [], actions: [] }),
    );
    renderPage();
    await screen.findByLabelText("User ID");
    fireEvent.change(screen.getByLabelText("User ID"), {
      target: { value: "777777777777777777" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Ban" }));
    expect(await screen.findByText("nope")).toBeTruthy();
  });
});
