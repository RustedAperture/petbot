// @vitest-environment happy-dom
/// <reference lib="dom" />
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createElement, act } from "react";
import { createRoot } from "react-dom/client";

import { useLiveEvents } from "@/hooks/use-live-events";
import type { LiveActionEvent, LiveScope } from "@/types/live";

class FakeEventSource {
  static instances: FakeEventSource[] = [];
  static CLOSED = 2;
  static get last() {
    return FakeEventSource.instances[FakeEventSource.instances.length - 1];
  }
  readyState = 0;
  closed = false;
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  listeners = new Map<string, Array<(e: MessageEvent) => void>>();

  constructor(public url: string) {
    FakeEventSource.instances.push(this);
  }
  addEventListener(type: string, fn: (e: MessageEvent) => void) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), fn]);
  }
  close() {
    this.closed = true;
    this.readyState = FakeEventSource.CLOSED;
  }
  open() {
    this.readyState = 1;
    act(() => this.onopen?.());
  }
  fail(isClosed = false) {
    if (isClosed) {
      this.readyState = FakeEventSource.CLOSED;
    }
    act(() => this.onerror?.());
  }
  emit(type: string, data: unknown) {
    act(() => {
      for (const fn of this.listeners.get(type) ?? []) {
        fn({ data: JSON.stringify(data) } as MessageEvent);
      }
    });
  }
}

function renderHook<T>(hookFn: () => T) {
  const result: { current: T } = { current: null as unknown as T };
  function HookHarness() {
    result.current = hookFn();
    return null;
  }
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(createElement(HookHarness));
  });
  return {
    result,
    rerender() {
      act(() => root.render(createElement(HookHarness)));
    },
    unmount() {
      act(() => root.unmount());
      container.remove();
    },
  };
}

const ev = (id: number): LiveActionEvent => ({
  id,
  actionType: "pet",
  createdAt: "2026-01-01T00:00:00Z",
});
const json = (body: unknown) => ({ ok: true, json: async () => body });
const flush = () =>
  act(async () => {
    for (let i = 0; i < 5; i++) {
      await Promise.resolve();
    }
  });
const global: LiveScope = { kind: "global" };

describe("useLiveEvents", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    FakeEventSource.instances = [];
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("EventSource", FakeEventSource);
    vi.spyOn(Math, "random").mockReturnValue(0.5);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("orders a backfill that resolves after stream events newest-first", async () => {
    let resolveFetch: (value: unknown) => void = () => {};
    fetchMock.mockReturnValue(new Promise((resolve) => (resolveFetch = resolve)));
    const r = renderHook(() => useLiveEvents(global));
    FakeEventSource.last.open();
    FakeEventSource.last.emit("action", ev(10));
    resolveFetch(json({ events: [ev(11), ev(10)] }));
    await flush();
    expect(r.result.current.events.map((e) => e.id)).toEqual([11, 10]);
    r.unmount();
  });

  it("backfills, then prepends stream events and fires onEvent", async () => {
    fetchMock.mockResolvedValue(json({ events: [ev(2), ev(1)] }));
    const onEvent = vi.fn();
    const r = renderHook(() => useLiveEvents(global, { onEvent }));
    await flush();
    expect(FakeEventSource.last.url).toBe("/api/events/stream");
    FakeEventSource.last.open();
    FakeEventSource.last.emit("action", ev(3));
    expect(r.result.current.events.map((e) => e.id)).toEqual([3, 2, 1]);
    expect(onEvent).toHaveBeenCalledTimes(1);
    expect(r.result.current.latestLiveEvent?.id).toBe(3);
    expect(r.result.current.status).toBe("live");
    expect(r.result.current.isLoading).toBe(false);
    r.unmount();
  });

  it("ignores a stream event already in the backfill", async () => {
    fetchMock.mockResolvedValue(json({ events: [ev(5)] }));
    const onEvent = vi.fn();
    const r = renderHook(() => useLiveEvents(global, { onEvent }));
    await flush();
    FakeEventSource.last.emit("action", ev(5));
    expect(r.result.current.events).toHaveLength(1);
    expect(onEvent).not.toHaveBeenCalled();
    r.unmount();
  });

  it("caps the list at 50", async () => {
    const backfill = Array.from({ length: 50 }, (_, i) => ev(50 - i));
    fetchMock.mockResolvedValue(json({ events: backfill }));
    const r = renderHook(() => useLiveEvents(global));
    await flush();
    FakeEventSource.last.emit("action", ev(51));
    expect(r.result.current.events).toHaveLength(50);
    expect(r.result.current.events[0].id).toBe(51);
    r.unmount();
  });

  it("keeps the stream and empty events when the backfill fails", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 503, json: async () => ({}) });
    const r = renderHook(() => useLiveEvents(global));
    await flush();
    expect(r.result.current.events).toEqual([]);
    expect(r.result.current.isLoading).toBe(false);
    expect(FakeEventSource.instances).toHaveLength(1);
    r.unmount();
  });

  it("calls onReconnect once after an error then reopen", async () => {
    fetchMock.mockResolvedValue(json({ events: [] }));
    const onReconnect = vi.fn();
    const r = renderHook(() => useLiveEvents(global, { onReconnect }));
    await flush();
    FakeEventSource.last.open();
    FakeEventSource.last.fail();
    expect(r.result.current.status).toBe("reconnecting");
    FakeEventSource.last.open();
    expect(onReconnect).toHaveBeenCalledTimes(1);
    expect(r.result.current.status).toBe("live");
    r.unmount();
  });

  it("refetches recent history after a reopen and merges it in order", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ events: [ev(2), ev(1)] }))
      .mockResolvedValueOnce(json({ events: [ev(5), ev(4), ev(3), ev(2)] }));
    const r = renderHook(() => useLiveEvents(global));
    await flush();
    FakeEventSource.last.open();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    FakeEventSource.last.fail();
    FakeEventSource.last.open();
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(r.result.current.events.map((e) => e.id)).toEqual([5, 4, 3, 2, 1]);
    r.unmount();
  });

  it("keeps only the newest 50 events as stream events accumulate", async () => {
    fetchMock.mockResolvedValue(json({ events: [] }));
    const r = renderHook(() => useLiveEvents(global));
    await flush();
    for (let id = 1; id <= 60; id++) {
      FakeEventSource.last.emit("action", ev(id));
    }
    expect(r.result.current.events).toHaveLength(50);
    expect(r.result.current.events[49].id).toBe(11);
    r.unmount();
  });

  it("does not reopen the stream when callback identities change", async () => {
    fetchMock.mockResolvedValue(json({ events: [] }));
    const r = renderHook(() => useLiveEvents(global, { onEvent: () => {} }));
    await flush();
    r.rerender();
    r.rerender();
    r.unmount();
    expect(FakeEventSource.instances).toHaveLength(1);
  });

  it("does nothing with a null scope", async () => {
    const r = renderHook(() => useLiveEvents(null));
    await flush();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(FakeEventSource.instances).toHaveLength(0);
    r.unmount();
  });

  it("closes the stream on unmount", async () => {
    fetchMock.mockResolvedValue(json({ events: [] }));
    const r = renderHook(() => useLiveEvents(global));
    await flush();
    r.unmount();
    expect(FakeEventSource.last.closed).toBe(true);
  });

  it("recreates a closed source after backoff and reconnects", async () => {
    vi.useFakeTimers();
    fetchMock.mockResolvedValue(json({ events: [] }));
    const onReconnect = vi.fn();
    const r = renderHook(() => useLiveEvents(global, { onReconnect }));
    await flush();
    FakeEventSource.last.fail(true);
    expect(FakeEventSource.instances).toHaveLength(1);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(FakeEventSource.instances).toHaveLength(2);
    FakeEventSource.last.open();
    expect(onReconnect).toHaveBeenCalledTimes(1);
    expect(r.result.current.status).toBe("live");
    r.unmount();
  });

  it("doubles the backoff up to 30s and resets after open", async () => {
    vi.useFakeTimers();
    fetchMock.mockResolvedValue(json({ events: [] }));
    const r = renderHook(() => useLiveEvents(global));
    await flush();
    const delays = [1000, 2000, 4000, 8000, 16000, 30000, 30000];
    for (const [i, d] of delays.entries()) {
      FakeEventSource.last.fail(true);
      act(() => {
        vi.advanceTimersByTime(d - 1);
      });
      expect(FakeEventSource.instances).toHaveLength(i + 1);
      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(FakeEventSource.instances).toHaveLength(i + 2);
    }
    FakeEventSource.last.open();
    FakeEventSource.last.fail(true);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(FakeEventSource.instances).toHaveLength(delays.length + 2);
    r.unmount();
  });

  it("creates no source if unmounted before the retry fires", async () => {
    vi.useFakeTimers();
    fetchMock.mockResolvedValue(json({ events: [] }));
    const r = renderHook(() => useLiveEvents(global));
    await flush();
    FakeEventSource.last.fail(true);
    r.unmount();
    act(() => {
      vi.advanceTimersByTime(60000);
    });
    expect(FakeEventSource.instances).toHaveLength(1);
  });

  it("returns an idle state and closes the source when the scope becomes null", async () => {
    fetchMock.mockResolvedValue(json({ events: [ev(1)] }));
    let scope: LiveScope | null = global;
    const r = renderHook(() => useLiveEvents(scope));
    await flush();
    FakeEventSource.last.open();
    expect(r.result.current.events).toHaveLength(1);
    expect(r.result.current.status).toBe("live");
    const old = FakeEventSource.last;

    scope = null;
    r.rerender();
    expect(r.result.current).toEqual({
      events: [],
      status: "connecting",
      isLoading: false,
      latestLiveEvent: null,
    });
    expect(old.closed).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(FakeEventSource.instances).toHaveLength(1);
    r.unmount();
  });

  it("drops a pending retry when the scope changes", async () => {
    vi.useFakeTimers();
    fetchMock.mockResolvedValue(json({ events: [] }));
    let scope: LiveScope = global;
    const r = renderHook(() => useLiveEvents(scope));
    await flush();
    FakeEventSource.last.fail(true);

    scope = { kind: "guild", guildId: "g1" };
    r.rerender();
    await flush();
    act(() => {
      vi.advanceTimersByTime(60000);
    });

    expect(FakeEventSource.instances.map((s) => s.url)).toEqual([
      "/api/events/stream",
      "/api/events/guild/g1/stream",
    ]);
    FakeEventSource.last.open();
    expect(r.result.current.status).toBe("live");
    expect(FakeEventSource.last.closed).toBe(false);
    r.unmount();
  });
});
