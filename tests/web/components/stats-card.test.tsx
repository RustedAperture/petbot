// @vitest-environment happy-dom
/// <reference lib="dom" />
import { describe, it, expect, vi } from "vitest";
import { createElement } from "react";
import { createRoot } from "react-dom/client";

import StatsCard from "../../../apps/web/components/stats/stats-card.js";
// tsx import of a .js file loses the React component signature – coerce to any
const StatsCardAny = StatsCard as any;

// Mock Next.js Image to render a plain <img> element so tests run in happy-dom
vi.mock("next/image", () => ({
  __esModule: true,
  default: (props: any) => createElement("img", props),
}));

// Embla carousel does not work in happy-dom; mock the carousel components to
// render their children and provide a fake API for navigation.
vi.mock("../../../apps/web/components/ui/carousel.js", () => {
  const React = require("react");
  const api: any = { scrollPrev: vi.fn(), scrollNext: vi.fn() };

  return {
    __esModule: true,
    __api: api,
    Carousel: ({ children, setApi }: any) => {
      if (setApi) {
        setApi(api);
      }
      return React.createElement(
        "div",
        { "data-testid": "carousel" },
        children,
      );
    },
    CarouselContent: ({ children }: any) =>
      React.createElement("div", null, children),
    CarouselItem: ({ children }: any) =>
      React.createElement("div", null, children),
  };
});

function render(element: any) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  root.render(createElement(() => element));
  return {
    container,
    unmount() {
      root.unmount();
      container.remove();
    },
  };
}

describe("StatsCard component carousel support", () => {
  const baseProps = {
    actionName: "pet",
    actionImageUrl: "https://example.com/action.png",
    performedCount: 5,
    userCount: 3,
    totalUniqueUsers: 10,
    totalActionsPerformed: 20,
  } as const;

  it("renders default image when no userImages passed", () => {
    const { container, unmount } = render(<StatsCardAny {...baseProps} />);
    expect(container.querySelectorAll("img").length).toBe(1);
    expect(container.querySelector("img")?.getAttribute("src")).toBe(
      "https://example.com/action.png",
    );
    // no carousel controls when there are no user images
    expect(container.querySelector("[data-testid='prev']")).toBeNull();
    expect(container.querySelector("[data-testid='next']")).toBeNull();
    unmount();
  });

  it("renders carousel when userImages provided", () => {
    const imgs = ["a.png", "b.png", "c.png"];
    const { container, unmount } = render(
      <StatsCardAny {...baseProps} userImages={imgs} />,
    );
    // carousel wrapper should exist
    expect(container.querySelector("[data-testid='carousel']")).toBeTruthy();
    // arrow buttons should be present in header
    const prevBtn = container.querySelector("[data-testid='prev']");
    const nextBtn = container.querySelector("[data-testid='next']");
    expect(prevBtn).toBeTruthy();
    expect(nextBtn).toBeTruthy();
    // ensure buttons are rendered alongside the title text
    expect(prevBtn?.parentElement?.textContent).toContain("pet");
    expect(nextBtn?.parentElement?.textContent).toContain("pet");
    // clicking the buttons should call the fake API
    if (prevBtn) {
      prevBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    }
    if (nextBtn) {
      nextBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    }
    // verify the mocked methods were invoked via the exported __api object
    const carouselMock = require("../../../apps/web/components/ui/carousel.js");
    expect(carouselMock.__api.scrollPrev).toHaveBeenCalled();
    expect(carouselMock.__api.scrollNext).toHaveBeenCalled();
    // each image should appear inside carousel items
    const renderedImgs = container.querySelectorAll("img");
    expect(renderedImgs.length).toBe(imgs.length);
    expect(Array.from(renderedImgs).map((i) => i.getAttribute("src"))).toEqual(
      imgs,
    );
    unmount();
  });
});
