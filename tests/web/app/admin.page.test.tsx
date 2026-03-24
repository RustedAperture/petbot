// @vitest-environment happy-dom
/// <reference lib="dom" />

// Required for React's act() to work outside of a full testing-library setup
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

import { it, describe, expect, vi, beforeEach, afterEach } from "vitest";
import { createElement, act } from "react";
import { createRoot } from "react-dom/client";

const useSessionMock = vi.fn();
let mockedGuildId: string | undefined = "guild-id";

vi.mock("../../../apps/web/hooks/use-session.js", () => ({
  useSession: () => useSessionMock(),
}));
vi.mock("next/navigation", () => ({
  useParams: () => ({ guildId: mockedGuildId }),
}));

// Avoid @base-ui/select rendering bloat since it can require React internals
vi.mock("../../../apps/web/components/ui/select.js", async () => ({
  __esModule: true,
  Select: ({ children }: any) => createElement("div", null, children),
  SelectTrigger: ({ children }: any) => createElement("div", null, children),
  SelectContent: ({ children }: any) => createElement("div", null, children),
  SelectGroup: ({ children }: any) => createElement("div", null, children),
  SelectLabel: ({ children }: any) => createElement("div", null, children),
  SelectItem: ({ children }: any) => createElement("div", null, children),
  SelectValue: ({ placeholder }: any) =>
    createElement("span", null, placeholder),
}));

vi.mock("../../../apps/web/components/ui/switch.js", async () => ({
  __esModule: true,
  Switch: () => createElement("input", { type: "checkbox" }),
}));

vi.mock("../../../apps/web/components/ui/field.js", async () => ({
  __esModule: true,
  FieldGroup: ({ children }: any) => createElement("div", null, children),
  Field: ({ children }: any) => createElement("div", null, children),
  FieldLabel: ({ children }: any) => createElement("label", null, children),
  FieldDescription: ({ children }: any) => createElement("p", null, children),
  FieldContent: ({ children }: any) => createElement("div", null, children),
  FieldTitle: ({ children }: any) => createElement("strong", null, children),
}));

vi.mock("../../../apps/web/components/ui/alert.js", async () => ({
  __esModule: true,
  Alert: ({ children }: any) => createElement("div", null, children),
  AlertTitle: ({ children }: any) => createElement("h2", null, children),
  AlertDescription: ({ children }: any) => createElement("p", null, children),
}));

vi.mock("lucide-react", async () => ({
  InfoIcon: () => createElement("span", null, "info-icon"),
}));

import AdminGuildPage from "../../../apps/web/app/admin/[guildId]/page.js";

function render(vdom: any) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(createElement(vdom));
  });
  return { container, root };
}

describe("AdminGuildPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    // restore any stubs on globals
    vi.unstubAllGlobals();
  });

  it("shows skeletons while session is loading", () => {
    mockedGuildId = "guild-id";

    useSessionMock.mockReturnValue({ session: null, loading: true });

    const { container, root } = render(AdminGuildPage);

    // skeleton renders as elements with animate-pulse via Skeleton component
    expect(
      container.querySelectorAll('[data-slot="skeleton"]').length,
    ).toBeGreaterThan(0);

    act(() => root.unmount());
    container.remove();
  });

  it("renders header and Save button after load", async () => {
    mockedGuildId = "guild-id";

    useSessionMock.mockReturnValue({
      session: {
        user: { id: "user1" },
        guilds: [{ id: "guild-id", name: "My Guild" }],
      },
      loading: false,
    });

    // mock guild channels fetch to succeed
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ channels: [] }),
      }),
    );

    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const { container, root } = render(AdminGuildPage);

    // wait for async effects
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(container.textContent).toContain("My Guild");
    const saveBtn = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent === "Save",
    );
    expect(saveBtn).toBeDefined();

    // click save and ensure handler runs (console.log called)
    await act(async () => {
      saveBtn!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await new Promise((r) => setTimeout(r, 600));
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Saving guild settings"),
      expect.any(Object),
    );

    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  it("stays in loading state if guildId isn't known yet", () => {
    mockedGuildId = undefined;

    useSessionMock.mockReturnValue({
      session: { user: { id: "user1" } },
      loading: false,
    });

    const { container, root } = render(AdminGuildPage);
    // The page renders Skeleton components when still loading and guildId
    // isn't known; there is no visible "Loading server settings..." text.
    expect(
      container.querySelectorAll('[data-slot="skeleton"]').length,
    ).toBeGreaterThan(0);

    act(() => root.unmount());
    container.remove();

    mockedGuildId = "guild-id";
  });

  it("shows forbidden message and does not render form if access is forbidden", async () => {
    mockedGuildId = "guild-id";
    useSessionMock.mockReturnValue({
      session: { user: { id: "user1" } },
      loading: false,
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({ error: "forbidden" }),
      }),
    );

    const { container, root } = render(AdminGuildPage);

    expect(useSessionMock).toHaveBeenCalled();

    await act(async () => {
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    });

    expect(container.textContent).toContain("Bot not in server");
    expect(container.textContent).not.toContain("Nickname");

    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });
});
