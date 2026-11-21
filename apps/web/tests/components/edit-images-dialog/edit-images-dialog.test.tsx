import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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

describe("EditImagesDialog saving", () => {
  function renderOpen() {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    (globalThis as any).fetch = fetchMock;
    render(
      createElement(EditImagesDialog, {
        ...baseProps,
        open: true,
        initialImages: ["https://a.example/1.png"],
      }),
    );
    return fetchMock;
  }

  const sentBody = (fetchMock: ReturnType<typeof vi.fn>) =>
    JSON.parse((fetchMock.mock.calls[0] as any[])[1].body);

  it("saves everywhere by default, after confirming", async () => {
    const fetchMock = renderOpen();
    expect(screen.getByRole("checkbox")).toHaveAttribute(
      "aria-checked",
      "true",
    );
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.click(
      await screen.findByRole("button", { name: "Save everywhere" }),
    );
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(sentBody(fetchMock)).toMatchObject({
      everywhere: true,
      guildId: null,
    });
  });

  it("saves for this server only without asking once unticked", async () => {
    const fetchMock = renderOpen();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(sentBody(fetchMock)).toMatchObject({
      everywhere: false,
      guildId: "g1",
    });
  });
});
