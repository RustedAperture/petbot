import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { createElement } from "react";

import { ImagePreview } from "@/app/admin/[guildId]/AdminGuildSettingsForm";

const A = "https://a.example/pet.png";
const B = "https://b.example/pet.png";

const preview = (url: string) =>
  createElement(ImagePreview, { url, alt: "preview" });

describe("ImagePreview", () => {
  it("hides the preview after a load error", () => {
    render(preview(A));
    fireEvent.error(screen.getByAltText("preview"));
    expect(screen.queryByAltText("preview")).toBeNull();
  });

  it("shows a new URL after the previous one failed", () => {
    const { rerender } = render(preview(A));
    fireEvent.error(screen.getByAltText("preview"));

    rerender(preview(B));
    expect(screen.getByAltText("preview").getAttribute("src")).toBe(B);
  });

  it("retries a URL that failed earlier once it is entered again", () => {
    const { rerender } = render(preview(A));
    fireEvent.error(screen.getByAltText("preview"));

    rerender(preview(""));
    rerender(preview(A));
    expect(screen.getByAltText("preview").getAttribute("src")).toBe(A);
  });
});
