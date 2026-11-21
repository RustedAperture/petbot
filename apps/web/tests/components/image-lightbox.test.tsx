// @vitest-environment happy-dom
/// <reference lib="dom" />
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ImageLightbox } from "@/components/dialogs/image-lightbox";

afterEach(cleanup);

function renderLightbox(images: string[]) {
  render(
    <ImageLightbox
      open
      onOpenChange={vi.fn()}
      title="Pet images"
      images={images}
      startIndex={0}
    />,
  );
}

describe("ImageLightbox", () => {
  it("shows each image under the title", () => {
    renderLightbox(["https://x.io/1.png", "https://x.io/2.png"]);
    expect(screen.getByText("Pet images")).toBeInTheDocument();
    expect(screen.getByAltText("Pet images 1 of 2")).toBeInTheDocument();
    expect(screen.getByAltText("Pet images 2 of 2")).toBeInTheDocument();
  });

  it.each([
    [1, false],
    [2, true],
  ])("with %i image(s), shows arrows: %s", (count, hasArrows) => {
    renderLightbox(
      Array.from({ length: count }, (_, i) => `https://x.io/${i}.png`),
    );
    expect(screen.queryByText("Next slide") !== null).toBe(hasArrows);
    expect(screen.queryByText("Previous slide") !== null).toBe(hasArrows);
  });
});
