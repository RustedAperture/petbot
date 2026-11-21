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

const save = vi.fn();
vi.mock("@/hooks/use-custom-actions", () => ({
  useCustomActions: () => ({ save }),
  usePhraseFor: (name: string) => (name === "shake" ? "shook" : null),
}));

import { AdoptActionDialog } from "@/components/dialogs/adopt-action-dialog";

const onClose = vi.fn();

beforeEach(() => {
  save.mockReset();
  onClose.mockReset();
});
afterEach(cleanup);

function renderDialog() {
  render(<AdoptActionDialog userId="1" name="shake" onClose={onClose} />);
}

describe("AdoptActionDialog", () => {
  it("opens with the suggested phrase and saves it under the same name", async () => {
    save.mockResolvedValue(null);
    renderDialog();
    expect(screen.getByLabelText("Phrase")).toHaveValue("shook");
    fireEvent.change(screen.getByLabelText("Image URL"), {
      target: { value: " https://x.io/s.png " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Adopt" }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(save).toHaveBeenCalledWith({
      name: "shake",
      phrase: "shook",
      image: "https://x.io/s.png",
    });
  });

  it("saves a phrase typed over the suggestion", async () => {
    save.mockResolvedValue(null);
    renderDialog();
    fireEvent.change(screen.getByLabelText("Phrase"), {
      target: { value: "shimmied" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Adopt" }));
    await waitFor(() =>
      expect(save).toHaveBeenCalledWith(
        expect.objectContaining({ phrase: "shimmied" }),
      ),
    );
  });

  it("shows a failed save and stays open", async () => {
    save.mockResolvedValue("You've reached the limit of 5 custom actions.");
    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "Adopt" }));
    expect(
      await screen.findByText("You've reached the limit of 5 custom actions."),
    ).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
});
