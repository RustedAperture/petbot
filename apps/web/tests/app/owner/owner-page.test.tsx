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

import OwnerPage from "@/app/owner/page";

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
    render(<OwnerPage />);
    expect(
      screen.getByText("You don't have access to this page."),
    ).toBeTruthy();
    expect(screen.queryByText("Banned creators")).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("lists actions and bans for the owner", async () => {
    render(<OwnerPage />);
    expect(await screen.findByText("booped")).toBeTruthy();
    expect(screen.getByText("900")).toBeTruthy();
    expect(await screen.findByText("555")).toBeTruthy();
  });

  it("sends the filter as name", async () => {
    render(<OwnerPage />);
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
    render(<OwnerPage />);
    await screen.findByText("555");
    fireEvent.change(screen.getByLabelText("User ID"), {
      target: { value: "777" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Ban" }));
    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/owner/bans/777",
        expect.objectContaining({ method: "PUT" }),
      ),
    );
  });

  it("unbans a user", async () => {
    render(<OwnerPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Unban 555" }));
    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/owner/bans/555",
        expect.objectContaining({ method: "DELETE" }),
      ),
    );
  });

  it("confirms before deleting an action", async () => {
    render(<OwnerPage />);
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
      init?.method === "PUT" ? json({ error: "nope" }, 500) : json({ bans: [], actions: [] }),
    );
    render(<OwnerPage />);
    await screen.findByLabelText("User ID");
    fireEvent.change(screen.getByLabelText("User ID"), {
      target: { value: "777" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Ban" }));
    expect(await screen.findByText("nope")).toBeTruthy();
  });
});
