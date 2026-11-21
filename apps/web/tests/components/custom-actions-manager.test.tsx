// @vitest-environment happy-dom
/// <reference lib="dom" />
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const hook = {
  actions: [] as any[],
  isLoading: false,
  error: null,
  save: vi.fn(),
  remove: vi.fn(),
};
const commonPhrases: Record<string, string> = { shake: "shook" };
vi.mock("@/hooks/use-custom-actions", () => ({
  useCustomActions: () => hook,
  useCommonPhrase: (name: string) => commonPhrases[name] ?? null,
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
  hook.remove = vi.fn().mockResolvedValue(null);
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

  it("shows each action's image as a button that opens it", () => {
    render(<CustomActionsManager scope={scope} />);
    const view = screen.getByRole("button", { name: "View boop image" });
    expect(view.querySelector("img")?.getAttribute("src")).toContain(
      encodeURIComponent("https://x.io/a.png"),
    );
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

  it("asks before removing an action", async () => {
    render(<CustomActionsManager scope={scope} />);
    fireEvent.click(screen.getByRole("button", { name: "Remove boop" }));
    expect(hook.remove).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole("button", { name: "Remove" }));
    await waitFor(() => expect(hook.remove).toHaveBeenCalledWith("boop"));
  });

  it("edits an action's phrase and image, keeping its name", async () => {
    render(<CustomActionsManager scope={scope} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit boop" }));
    const dialog = within(await screen.findByRole("dialog"));
    fireEvent.change(dialog.getByLabelText("Phrase"), {
      target: { value: "bopped" },
    });
    fireEvent.click(dialog.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(hook.save).toHaveBeenCalledWith({
        name: "boop",
        phrase: "bopped",
        image: "https://x.io/a.png",
      }),
    );
  });

  it("shows a failed edit inside the dialog", async () => {
    hook.save.mockResolvedValue("Your URL is invalid, please try again");
    render(<CustomActionsManager scope={scope} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit boop" }));
    const dialog = within(await screen.findByRole("dialog"));
    fireEvent.click(dialog.getByRole("button", { name: "Save" }));
    expect(
      await dialog.findByText("Your URL is invalid, please try again"),
    ).toBeInTheDocument();
  });

  it("keeps the action when the removal is cancelled", async () => {
    render(<CustomActionsManager scope={scope} />);
    fireEvent.click(screen.getByRole("button", { name: "Remove boop" }));
    fireEvent.click(await screen.findByRole("button", { name: "Cancel" }));
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Remove" })).toBeNull(),
    );
    expect(hook.remove).not.toHaveBeenCalled();
  });

  it("offers the phrase an existing name uses, leaving the image alone", () => {
    render(<CustomActionsManager scope={scope} />);
    fill("Shake", "", "https://x.io/mine.png");
    expect(screen.getByText("Suggested phrase: “shook”.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Use this phrase" }));
    expect(screen.getByLabelText("Phrase")).toHaveValue("shook");
    expect(screen.getByLabelText("Image URL")).toHaveValue(
      "https://x.io/mine.png",
    );
    expect(
      screen.queryByRole("button", { name: "Use this phrase" }),
    ).toBeNull();
  });

  it("renders its dialogs without duplicate React keys", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    render(<CustomActionsManager scope={scope} />);
    expect(
      consoleError.mock.calls.some((args) =>
        String(args[0]).includes("same key"),
      ),
    ).toBe(false);
    consoleError.mockRestore();
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

describe("CustomActionsManager failures", () => {
  it("shows a failed remove inline", async () => {
    hook.remove.mockResolvedValue("not_found");
    render(<CustomActionsManager scope={scope} />);
    fireEvent.click(screen.getByRole("button", { name: "Remove boop" }));
    fireEvent.click(await screen.findByRole("button", { name: "Remove" }));
    expect(await screen.findByText("not_found")).toBeInTheDocument();
  });

  it("shows a failed load inline", () => {
    (hook as any).error = new Error("Add PetBot first.");
    render(<CustomActionsManager scope={scope} />);
    expect(screen.getByText("Add PetBot first.")).toBeInTheDocument();
    (hook as any).error = null;
  });
});
