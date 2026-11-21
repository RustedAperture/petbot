// @vitest-environment happy-dom
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

import { act, renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCustomActions } from "@/hooks/use-custom-actions";

const wrapper = ({ children }: { children: ReactNode }) => (
  <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
    {children}
  </SWRConfig>
);
const scope = { kind: "user", userId: "1" } as const;
const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), { status });

let mockFetch: ReturnType<typeof vi.fn>;
beforeEach(() => {
  mockFetch = vi.fn();
  vi.stubGlobal("fetch", mockFetch);
});
afterEach(() => vi.unstubAllGlobals());

describe("useCustomActions", () => {
  it("surfaces the API error text when the list fails", async () => {
    mockFetch.mockResolvedValue(json({ error: "Add PetBot first." }, 400));
    const { result } = renderHook(() => useCustomActions(scope), { wrapper });
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.error?.message).toBe("Add PetBot first.");
  });

  it("returns the API error text when a delete fails", async () => {
    mockFetch
      .mockResolvedValueOnce(json({ actions: [] }, 200))
      .mockResolvedValueOnce(json({ error: "not_found" }, 404));
    const { result } = renderHook(() => useCustomActions(scope), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    let message: string | null = null;
    await act(async () => {
      message = await result.current.remove("boop");
    });
    expect(message).toBe("not_found");
  });

  it("returns a fallback message when a delete rejects", async () => {
    mockFetch
      .mockResolvedValueOnce(json({ actions: [] }, 200))
      .mockRejectedValueOnce(new Error("offline"));
    const { result } = renderHook(() => useCustomActions(scope), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    let message: string | null = null;
    await act(async () => {
      message = await result.current.remove("boop");
    });
    expect(message).toBe("Something went wrong. Please try again.");
  });

  it("returns a fallback message when a save rejects", async () => {
    mockFetch
      .mockResolvedValueOnce(json({ actions: [] }, 200))
      .mockRejectedValueOnce(new Error("offline"));
    const { result } = renderHook(() => useCustomActions(scope), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    let message: string | null = null;
    await act(async () => {
      message = await result.current.save({
        name: "a",
        phrase: "b",
        image: "c",
      });
    });
    expect(message).toBe("Something went wrong. Please try again.");
  });
});
