import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

import { useIsMobile } from "../../hooks/use-mobile";

describe("useIsMobile", () => {
  let listeners: Set<() => void>;
  const addEventListener = vi.fn((_: string, fn: () => void) => {
    listeners.add(fn);
  });
  const removeEventListener = vi.fn((_: string, fn: () => void) => {
    listeners.delete(fn);
  });
  const originalMatchMedia = window.matchMedia;
  const originalInnerWidth = window.innerWidth;

  function setWidth(width: number) {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: width,
    });
  }

  beforeEach(() => {
    listeners = new Set();
    addEventListener.mockClear();
    removeEventListener.mockClear();
    window.matchMedia = vi.fn(
      () => ({ addEventListener, removeEventListener }) as any,
    );
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    setWidth(originalInnerWidth);
  });

  it("reports the initial width", () => {
    setWidth(500);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it("reports desktop widths as not mobile", () => {
    setWidth(1024);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it("updates when the media query changes", () => {
    setWidth(1024);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    setWidth(500);
    act(() => listeners.forEach((fn) => fn()));
    expect(result.current).toBe(true);
  });

  it("removes its listener on unmount", () => {
    const { unmount } = renderHook(() => useIsMobile());
    expect(listeners.size).toBe(1);

    unmount();
    expect(removeEventListener).toHaveBeenCalledWith(
      "change",
      expect.any(Function),
    );
    expect(listeners.size).toBe(0);
  });
});
