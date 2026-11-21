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
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/dialogs/image-lightbox", () => ({
  ImageLightbox: () => null,
}));

import DefaultImagesCard from "@/app/admin/[guildId]/DefaultImagesCard";

afterEach(cleanup);

const settings = {
  sleepImage: "",
  defaultImages: {
    pet: "https://x.io/pet.png",
    bite: "",
    hug: "",
    squish: "",
    bonk: "",
    explode: "",
  },
};

function editAndSave(row: string, url: string) {
  fireEvent.click(screen.getByRole("button", { name: `Edit ${row} images` }));
  fireEvent.change(screen.getByLabelText("Image URL"), {
    target: { value: url },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
}

describe("DefaultImagesCard", () => {
  it("shows set images, the bot's default for unset actions, and not set for sleep", () => {
    render(<DefaultImagesCard settings={settings} update={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: "View pet image 1" }),
    ).toBeTruthy();
    for (const action of ["bite", "hug", "squish", "bonk", "explode"]) {
      expect(
        screen.getByRole("button", { name: `View ${action} default image` }),
      ).toBeTruthy();
    }
    expect(screen.getAllByText("Default")).toHaveLength(5);
    expect(screen.getAllByText("Not set")).toHaveLength(1);
  });

  it.each([
    [
      "hug",
      {
        defaultImages: { ...settings.defaultImages, hug: "https://x.io/h.png" },
      },
    ],
    ["sleep", { sleepImage: "https://x.io/h.png" }],
  ])(
    "saving %s sends only that field, keeping the others",
    async (row, sent) => {
      const update = vi.fn().mockResolvedValue({});
      render(<DefaultImagesCard settings={settings} update={update} />);
      editAndSave(row, " https://x.io/h.png ");
      await waitFor(() => expect(update).toHaveBeenCalledWith(sent));
    },
  );

  it("rejects a URL that isn't one without saving", async () => {
    const update = vi.fn();
    render(<DefaultImagesCard settings={settings} update={update} />);
    editAndSave("bite", "not a url");
    expect(
      await screen.findByText(
        "Enter a valid image URL, or leave it empty to clear it.",
      ),
    ).toBeTruthy();
    expect(update).not.toHaveBeenCalled();
  });
});
