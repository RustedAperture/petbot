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

const hook = {
  actions: [] as any[],
  isLoading: false,
  error: null,
  save: vi.fn(),
  remove: vi.fn(),
};
vi.mock("@/hooks/use-custom-actions", () => ({
  useCustomActions: () => hook,
}));

import CustomActionsManager from "@/components/custom-actions-manager";

const action = (name: string, phrase: string) => ({
  id: name,
  name,
  phrase,
  scope: "user",
  ownerId: "1",
  image: "https://x.io/a.png",
  createdBy: "1",
  createdAt: "",
  updatedAt: "",
});

beforeEach(() => {
  hook.actions = [action("boop", "booped"), action("nuzzle", "nuzzled")];
  hook.save = vi.fn().mockResolvedValue(null);
  hook.remove = vi.fn().mockResolvedValue(undefined);
});
afterEach(cleanup);

const scope = { kind: "user", userId: "1" } as const;

function fill(name: string, phrase: string, image: string) {
  fireEvent.change(screen.getByLabelText("Name"), { target: { value: name } });
  fireEvent.change(screen.getByLabelText("Phrase"), {
    target: { value: phrase },
  });
  fireEvent.change(screen.getByLabelText("Image URL"), {
    target: { value: image },
  });
}

describe("CustomActionsManager", () => {
  it("shows the usage count and each action", () => {
    render(<CustomActionsManager scope={scope} />);
    expect(screen.getByText("2 of 5 used")).toBeInTheDocument();
    expect(screen.getByText("boop — booped")).toBeInTheDocument();
    expect(screen.getByText("nuzzle — nuzzled")).toBeInTheDocument();
  });

  it("shows the API error verbatim when a save fails", async () => {
    hook.save.mockResolvedValue(
      "You've reached the limit of 5 custom actions.",
    );
    render(<CustomActionsManager scope={scope} />);
    fill("zap", "zapped", "https://x.io/z.png");
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(
      await screen.findByText("You've reached the limit of 5 custom actions."),
    ).toBeInTheDocument();
  });

  it("clears the form after a successful save", async () => {
    render(<CustomActionsManager scope={scope} />);
    fill("zap", "zapped", "https://x.io/z.png");
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    await waitFor(() =>
      expect(hook.save).toHaveBeenCalledWith({
        name: "zap",
        phrase: "zapped",
        image: "https://x.io/z.png",
      }),
    );
    await waitFor(() =>
      expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe(
        "",
      ),
    );
  });

  it("removes an action", () => {
    render(<CustomActionsManager scope={scope} />);
    fireEvent.click(screen.getByRole("button", { name: "Remove boop" }));
    expect(hook.remove).toHaveBeenCalledWith("boop");
  });

  it("disables Add at the limit", () => {
    hook.actions = ["a", "b", "c", "d", "e"].map((n) => action(n, "x"));
    render(<CustomActionsManager scope={scope} />);
    expect(screen.getByText("5 of 5 used")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add" })).toBeDisabled();
  });

  it("keeps the button enabled at the limit when updating an existing name", () => {
    hook.actions = ["a", "b", "c", "d", "e"].map((n) => action(n, "x"));
    render(<CustomActionsManager scope={scope} />);
    fill("a", "new", "https://x.io/z.png");
    expect(screen.getByRole("button", { name: "Update" })).toBeEnabled();
  });

  it("shows an empty state with no actions", () => {
    hook.actions = [];
    render(<CustomActionsManager scope={scope} />);
    expect(screen.getByText("0 of 5 used")).toBeInTheDocument();
    expect(screen.getByText("No custom actions yet")).toBeInTheDocument();
  });
});
