// @vitest-environment happy-dom
/// <reference lib="dom" />

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";

import AdminGuildPage from "@/app/admin/[guildId]/page";
import AdminGuildPageContent from "@/app/admin/[guildId]/AdminGuildPageContent";

type GuildChannel = { id: string; name: string };

type GuildSettings = {
  nickname: string;
  logChannel: string;
  sleepImage: string;
  restricted: boolean;
  defaultImages: {
    pet: string;
    bite: string;
    hug: string;
    bonk: string;
    squish: string;
    explode: string;
  };
};

type GuildSettingsState = {
  settings: GuildSettings | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
  update: (values: Partial<GuildSettings>) => Promise<unknown>;
};

let params = { guildId: "guild1" };
let sessionState = {
  session: {
    user: { id: "user1" },
    guilds: [{ id: "guild1", name: "Test Guild", icon: "abc" }],
  },
  loading: false,
  refresh: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
};
let guildChannelsState: {
  channels: GuildChannel[];
  isLoading: boolean;
  error: Error | null;
} = { channels: [], isLoading: false, error: null };
let guildSettingsState: GuildSettingsState = {
  settings: null,
  isLoading: false,
  error: null,
  refresh: vi.fn(),
  update: vi.fn().mockResolvedValue({}),
};

vi.mock("next/navigation", () => ({
  useParams: () => params,
}));

vi.mock("@/hooks/use-session", () => ({
  useSession: () => sessionState,
}));

vi.mock("@/hooks/use-guild-channels", () => ({
  useGuildChannels: () => guildChannelsState,
}));

vi.mock("@/hooks/use-guild-settings", () => ({
  useGuildSettings: () => guildSettingsState,
}));

vi.mock("@/app/admin/[guildId]/AdminGuildSettingsForm", () => ({
  default: ({
    guildId,
    guild,
    pageLoading,
    isLoadingAll,
    channelsError,
    update,
  }: any) =>
    createElement(
      "div",
      null,
      pageLoading || isLoadingAll
        ? createElement("div", { className: "w-full" }, "Loading")
        : channelsError
          ? createElement("div", null, "Bot not in server")
          : createElement(
              "form",
              {
                onSubmit: (e: any) => {
                  e?.preventDefault?.();
                  if (update) update({ nickname: "PetBot" });
                },
              },
              createElement("h1", null, guild?.name || ""),
              `Guild ID: ${guildId}`,
              createElement("button", { type: "submit" }, "Save"),
            ),
    ),
}));

// Stub UI primitives for predictable test DOM and to avoid heavy base-ui internals.
// (passthrough must be declared before vi.mock calls due to hoisting.)

vi.mock("lucide-react", () => ({
  InfoIcon: (props: any) => createElement("svg", props, props.children),
}));

vi.mock("@/components/ui/card", () => ({
  Card: (props: any) => createElement("div", props, props.children),
  CardHeader: (props: any) => createElement("div", props, props.children),
  CardTitle: (props: any) => createElement("div", props, props.children),
  CardDescription: (props: any) => createElement("div", props, props.children),
  CardAction: (props: any) => createElement("div", props, props.children),
}));

vi.mock("@/components/ui/avatar", () => ({
  Avatar: (props: any) => createElement("div", props, props.children),
  AvatarImage: (props: any) => createElement("img", props, props.children),
  AvatarFallback: (props: any) => createElement("div", props, props.children),
}));

vi.mock("@/components/ui/field", () => ({
  Field: (props: any) => createElement("div", props, props.children),
  FieldContent: (props: any) => createElement("div", props, props.children),
  FieldDescription: (props: any) => createElement("div", props, props.children),
  FieldError: (props: any) => createElement("div", props, props.children),
  FieldGroup: (props: any) => createElement("div", props, props.children),
  FieldLabel: (props: any) => createElement("label", props, props.children),
  FieldTitle: (props: any) => createElement("div", props, props.children),
}));

vi.mock("@/components/ui/button", () => ({
  Button: (props: any) => createElement("button", props, props.children),
}));

vi.mock("@/components/ui/input", () => ({
  Input: (props: any) => createElement("input", props, props.children),
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({ children }: any) => createElement("div", null, children),
  SelectTrigger: ({ children }: any) => createElement("div", null, children),
  SelectContent: ({ children }: any) => createElement("div", null, children),
  SelectGroup: ({ children }: any) => createElement("div", null, children),
  SelectItem: ({ children }: any) => createElement("div", null, children),
  SelectLabel: ({ children }: any) => createElement("div", null, children),
  SelectValue: ({ children }: any) => createElement("div", null, children),
}));

vi.mock("@/components/ui/switch", () => ({
  Switch: (props: any) => createElement("input", props, props.children),
}));

vi.mock("@/components/ui/alert", () => ({
  Alert: (props: any) => createElement("div", props, props.children),
  AlertTitle: (props: any) => createElement("p", props, props.children),
  AlertDescription: (props: any) => createElement("p", props, props.children),
}));

vi.mock("@/components/ui/separator", () => ({
  Separator: (props: any) => createElement("hr", props, props.children),
}));

vi.mock("@/components/ui/skeleton", () => ({
  Skeleton: (props: any) => createElement("div", props, props.children),
}));

function render(element: any) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(element);
  });

  return {
    container,
    unmount() {
      act(() => root.unmount());
      container.remove();
    },
  };
}

describe("Admin guild page", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;

  beforeEach(() => {
    const ignorePattern =
      /(Unknown event handler property `onCheckedChange`|You provided a `checked` prop to a form field)/;
    consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation((...args: any[]) => {
        const message = String(args[0]);
        if (ignorePattern.test(message)) {
          return;
        }
        originalConsoleError(...args);
      });
    consoleWarnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation((...args: any[]) => {
        const message = String(args[0]);
        if (ignorePattern.test(message)) {
          return;
        }
        originalConsoleWarn(...args);
      });

    params = { guildId: "guild1" };
    sessionState = {
      session: {
        user: { id: "user1" },
        guilds: [{ id: "guild1", name: "Test Guild", icon: "abc" }],
      },
      loading: false,
      refresh: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
    };
    guildChannelsState = { channels: [], isLoading: false, error: null };
    guildSettingsState = {
      settings: {
        nickname: "PetBot",
        logChannel: "",
        sleepImage: "",
        restricted: false,
        defaultImages: {
          pet: "",
          bite: "",
          hug: "",
          bonk: "",
          squish: "",
          explode: "",
        },
      },
      isLoading: false,
      error: null,
      refresh: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
    };
    vi.clearAllMocks();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    // cleanup if render left anything behind
    document.body.innerHTML = "";
  });

  it("renders AdminGuildPage with params-derived guildId", () => {
    const { container, unmount } = render(<AdminGuildPage />);
    expect(container.textContent).toContain("Test Guild");
    unmount();
  });

  it("shows loading skeleton while session or channel loading", () => {
    sessionState.loading = true;
    guildChannelsState = { channels: [], isLoading: true, error: null };
    guildSettingsState.isLoading = true;

    const { container, unmount } = render(
      <AdminGuildPageContent guildId="guild1" />,
    );

    // The page-loading skeleton should render, no form present yet.
    expect(container.querySelector("form")).toBeNull();
    expect(container.querySelector(".w-full")).toBeTruthy();

    unmount();
  });

  it("shows a bot-not-in-server alert if channels are forbidden", () => {
    guildChannelsState = {
      channels: [],
      isLoading: false,
      error: new Error("Forbidden: bot not in server"),
    };

    const { container, unmount } = render(
      <AdminGuildPageContent guildId="guild1" />,
    );

    expect(container.textContent).toContain("Bot not in server");

    unmount();
  });

  it("allows editing and submitting settings with update() called", async () => {
    guildChannelsState = {
      channels: [
        { id: "c1", name: "general" },
        { id: "c2", name: "random" },
      ],
      isLoading: false,
      error: null,
    };

    const { container, unmount } = render(
      <AdminGuildPageContent guildId="guild1" />,
    );

    const form = container.querySelector("form") as HTMLFormElement;
    expect(form).toBeTruthy();
    expect(container.textContent).toContain("Guild ID: guild1");

    const saveButton = container.querySelector("button") as HTMLButtonElement;
    expect(saveButton).toBeTruthy();

    await act(async () => {
      form.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
      // flush pending promises
      await Promise.resolve();
    });

    expect(guildSettingsState.update).toHaveBeenCalled();
    expect(guildSettingsState.update).toHaveBeenCalledWith(
      expect.objectContaining({ nickname: "PetBot" }),
    );

    unmount();
  });
});
