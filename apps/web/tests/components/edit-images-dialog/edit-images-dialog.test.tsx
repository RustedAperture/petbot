import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { createElement } from "react";

// Render the dialog inline when open so the reset logic can be exercised
// without base-ui portals.
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ open, children }: any) => (open ? children : null),
  DialogContent: ({ children }: any) => createElement("div", null, children),
  DialogFooter: ({ children }: any) => createElement("div", null, children),
  DialogHeader: ({ children }: any) => createElement("div", null, children),
  DialogTitle: ({ children }: any) => createElement("h2", null, children),
}));
vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: any) => children,
  TooltipContent: () => null,
  TooltipProvider: ({ children }: any) => children,
  TooltipTrigger: ({ children }: any) => children,
}));
vi.mock("next/image", () => ({
  __esModule: true,
  default: (props: any) => createElement("img", props),
}));

import { EditImagesDialog } from "@/components/dialogs/edit-images-dialog";

const baseProps = {
  onOpenChange: vi.fn(),
  actionName: "pet",
  guildId: "g1",
};

const slot = (n: number) =>
  screen.getByPlaceholderText(`Slot ${n} image URL`) as HTMLInputElement;

describe("EditImagesDialog reset", () => {
  it("restores the initial images when reopened", () => {
    const initialImages = ["https://a.example/1.png"];
    const { rerender } = render(
      createElement(EditImagesDialog, {
        ...baseProps,
        open: true,
        initialImages,
      }),
    );
    fireEvent.change(slot(1), { target: { value: "https://edited/1.png" } });
    expect(slot(1).value).toBe("https://edited/1.png");

    rerender(
      createElement(EditImagesDialog, {
        ...baseProps,
        open: false,
        initialImages,
      }),
    );
    rerender(
      createElement(EditImagesDialog, {
        ...baseProps,
        open: true,
        initialImages,
      }),
    );
    expect(slot(1).value).toBe("https://a.example/1.png");
  });

  it("picks up new initial images while open", () => {
    const { rerender } = render(
      createElement(EditImagesDialog, {
        ...baseProps,
        open: true,
        initialImages: ["https://a.example/1.png"],
      }),
    );
    rerender(
      createElement(EditImagesDialog, {
        ...baseProps,
        open: true,
        initialImages: ["https://b.example/1.png", "https://b.example/2.png"],
      }),
    );
    expect(slot(1).value).toBe("https://b.example/1.png");
    expect(slot(2).value).toBe("https://b.example/2.png");
  });

  it("keeps edits while open when initial images are unchanged", () => {
    const initialImages = ["https://a.example/1.png"];
    const { rerender } = render(
      createElement(EditImagesDialog, {
        ...baseProps,
        open: true,
        initialImages,
      }),
    );
    fireEvent.change(slot(1), { target: { value: "https://edited/1.png" } });
    rerender(
      createElement(EditImagesDialog, {
        ...baseProps,
        open: true,
        initialImages,
      }),
    );
    expect(slot(1).value).toBe("https://edited/1.png");
  });
});
