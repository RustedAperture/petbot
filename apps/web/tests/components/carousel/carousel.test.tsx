import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { createElement } from "react";

// Embla does not run in happy-dom; hand the carousel a fake API whose scroll
// state and events the tests control.
const handlers = new Map<string, Set<() => void>>();
const scrollState = { prev: false, next: true };
const api = {
  on: vi.fn((event: string, fn: () => void) => {
    if (!handlers.has(event)) {
      handlers.set(event, new Set());
    }
    handlers.get(event)!.add(fn);
  }),
  off: vi.fn((event: string, fn: () => void) => {
    handlers.get(event)?.delete(fn);
  }),
  canScrollPrev: () => scrollState.prev,
  canScrollNext: () => scrollState.next,
  scrollPrev: vi.fn(),
  scrollNext: vi.fn(),
};
const emit = (event: string) =>
  act(() => handlers.get(event)?.forEach((fn) => fn()));

vi.mock("embla-carousel-react", () => ({
  __esModule: true,
  default: () => [vi.fn(), api],
}));

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

function renderCarousel() {
  return render(
    createElement(
      Carousel,
      null,
      createElement(
        CarouselContent,
        null,
        createElement(CarouselItem, null, "one"),
        createElement(CarouselItem, null, "two"),
      ),
      createElement(CarouselPrevious),
      createElement(CarouselNext),
    ),
  );
}

const prevButton = () =>
  screen.getByRole("button", { name: /previous slide/i });
const nextButton = () => screen.getByRole("button", { name: /next slide/i });

describe("Carousel scroll state", () => {
  beforeEach(() => {
    handlers.clear();
    api.on.mockClear();
    api.off.mockClear();
    scrollState.prev = false;
    scrollState.next = true;
  });

  it("reads the initial scroll state from the API", () => {
    renderCarousel();
    expect((prevButton() as HTMLButtonElement).disabled).toBe(true);
    expect((nextButton() as HTMLButtonElement).disabled).toBe(false);
  });

  it("updates on select events", () => {
    renderCarousel();
    scrollState.prev = true;
    scrollState.next = false;
    emit("select");
    expect((prevButton() as HTMLButtonElement).disabled).toBe(false);
    expect((nextButton() as HTMLButtonElement).disabled).toBe(true);
  });

  it("updates on reInit events", () => {
    renderCarousel();
    scrollState.prev = true;
    emit("reInit");
    expect((prevButton() as HTMLButtonElement).disabled).toBe(false);
  });

  it("removes both listeners on unmount", () => {
    const { unmount } = renderCarousel();
    expect(handlers.get("select")?.size).toBeGreaterThan(0);
    expect(handlers.get("reInit")?.size).toBeGreaterThan(0);

    unmount();
    expect(handlers.get("select")?.size).toBe(0);
    expect(handlers.get("reInit")?.size).toBe(0);
  });
});
