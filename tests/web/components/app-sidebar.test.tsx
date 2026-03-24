// @vitest-environment happy-dom
/// <reference lib="dom" />

// Required for React's act() to work outside of a full testing-library setup
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createElement, act } from "react";
import { createRoot } from "react-dom/client";

// next/navigation needs to be stubbed outside of a Next App Router context
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));
// next/link also needs a simple stub to avoid DOM shipping warnings and
// navigation behavior in happy-dom. return an object with a default export
// that renders an actual <a> so we can query href attributes in tests.
vi.mock("next/link", () => {
  const React = require("react");
  return {
    default: ({ href, children, ...props }: any) =>
      React.createElement("a", { href, ...props }, children),
  };
});

import { AppSidebar } from "../../../apps/web/components/app-sidebar.js";
import { isAdminOrOwnerGuild } from "../../../apps/web/lib/utils.js";
import {
  SidebarProvider,
  useSidebar,
} from "../../../apps/web/components/ui/sidebar.js";

// Mock @base-ui-backed UI components that crash due to the dual-React-instance
// problem: apps/web/node_modules/@base-ui uses its own React copy while
// react-dom uses the root copy.
vi.mock("../../../apps/web/components/ui/tooltip.js", () => {
  const React = require("react");
  return {
    Tooltip: ({ children }: any) =>
      React.createElement(React.Fragment, null, children),
    TooltipProvider: ({ children }: any) =>
      React.createElement(React.Fragment, null, children),
    TooltipContent: () => null,
    TooltipTrigger: ({ children }: any) =>
      React.createElement(React.Fragment, null, children),
  };
});
vi.mock("../../../apps/web/components/ui/sheet.js", () => {
  const React = require("react");
  return {
    Sheet: ({ children }: any) =>
      React.createElement("div", { "data-slot": "sheet" }, children),
    SheetContent: ({ children }: any) =>
      React.createElement("div", null, children),
    SheetHeader: ({ children }: any) =>
      React.createElement("div", null, children),
    SheetTitle: ({ children }: any) =>
      React.createElement("div", null, children),
    SheetDescription: ({ children }: any) =>
      React.createElement("div", null, children),
    SheetTrigger: ({ children }: any) =>
      React.createElement("div", null, children),
    SheetClose: ({ children }: any) =>
      React.createElement("div", null, children),
  };
});
vi.mock("../../../apps/web/components/ui/sidebar.js", () => {
  const React = require("react");
  return {
    SidebarProvider: ({ children }: any) =>
      React.createElement(React.Fragment, null, children),
    useSidebar: () => ({
      isMobile: false,
      setOpenMobile: () => {},
      openMobile: false,
      open: false,
      toggleSidebar: () => {},
      setOpen: () => {},
    }),
    Sidebar: ({ children }: any) => React.createElement("div", null, children),
    SidebarContent: ({ children }: any) =>
      React.createElement("div", null, children),
    SidebarFooter: ({ children }: any) =>
      React.createElement("div", null, children),
    SidebarGroup: ({ children }: any) =>
      React.createElement("div", null, children),
    SidebarGroupContent: ({ children }: any) =>
      React.createElement("div", null, children),
    SidebarGroupLabel: ({ children }: any) =>
      React.createElement("div", null, children),
    SidebarMenu: ({ children }: any) =>
      React.createElement("div", null, children),
    SidebarMenuButton: ({ render }: any) => render,
    SidebarMenuItem: ({ children }: any) =>
      React.createElement("div", null, children),
    SidebarSeparator: () => React.createElement("hr", null),
    SidebarHeader: ({ children }: any) =>
      React.createElement("div", null, children),
  };
});

// DropdownMenu (ThemeToggle) and next-themes also use @base-ui/react/menu fastComponent
vi.mock("../../../apps/web/components/ui/dropdown-menu.js", () => {
  const React = require("react");
  return {
    DropdownMenu: ({ children }: any) =>
      React.createElement(React.Fragment, null, children),
    DropdownMenuTrigger: ({ children, render }: any) =>
      React.createElement(React.Fragment, null, render ?? children),
    DropdownMenuContent: ({ children }: any) =>
      React.createElement("div", null, children),
    DropdownMenuItem: ({ children, onClick }: any) =>
      React.createElement("div", { onClick }, children),
    DropdownMenuLabel: ({ children }: any) =>
      React.createElement("div", null, children),
    DropdownMenuSeparator: () => null,
    DropdownMenuGroup: ({ children }: any) =>
      React.createElement(React.Fragment, null, children),
    DropdownMenuSub: ({ children }: any) =>
      React.createElement(React.Fragment, null, children),
    DropdownMenuSubTrigger: ({ children }: any) =>
      React.createElement("div", null, children),
    DropdownMenuSubContent: ({ children }: any) =>
      React.createElement("div", null, children),
  };
});
vi.mock("next-themes", () => ({
  useTheme: () => ({ theme: "light", setTheme: () => {} }),
  ThemeProvider: ({ children }: any) => children,
}));

vi.mock("../../../apps/web/hooks/use-session.js", () => ({
  useSession: () => ({
    session: {
      user: { id: "123", username: "TestUser#0001" },
      guilds: [
        { id: "111", name: "Owner Server", owner: true },
        { id: "222", name: "Admin Server", permissions: "8" },
        { id: "333", name: "Member Server", permissions: "0" },
      ],
    },
    loading: false,
    refresh: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  }),
}));

function render(element: any) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(createElement(() => element));
  });
  return {
    container,
    unmount() {
      act(() => root.unmount());
      container.remove();
    },
  };
}

describe("AppSidebar mobile behaviour", () => {
  let context: any = null;

  // synchronously grab the sidebar context during render so tests can't see
  // a null value due to useEffect timing.
  function ContextReader({ onReady }: { onReady: (ctx: any) => void }) {
    const ctx = useSidebar();
    onReady(ctx);
    return null;
  }

  beforeEach(() => {
    context = null;
  });

  it.skip("closes mobile sidebar when a link is clicked", async () => {
    const { container, unmount } = render(
      <SidebarProvider>
        <AppSidebar />
        <ContextReader onReady={(ctx: any) => (context = ctx)} />
      </SidebarProvider>,
    );

    // ensure we have context and we can open mobile
    expect(context).not.toBeNull();

    // trigger a state update inside act and wait a microtask tick so the
    // provider has a chance to re-render and update `openMobile` value.
    await act(async () => {
      context.setOpenMobile(true);
      await Promise.resolve();
    });
    // at this point the update has flushed
    expect(context.openMobile).toBe(true);

    // find a stats link (first in menu)
    const link = container.querySelector("a[href='/']");
    expect(link).toBeTruthy();

    // Invoke the React onClick via the __reactProps$ annotation on the DOM
    // element. This is the same approach testing libraries use internally and
    // avoids happy-dom triggering a page navigation (which would abort pending
    // fetches and interrupt the React state-update cycle before act() can flush it).
    const reactPropsKey = Object.keys(link!).find((k) =>
      k.startsWith("__reactProps"),
    );
    const reactOnClick = reactPropsKey
      ? (link as any)[reactPropsKey]?.onClick
      : undefined;
    expect(reactOnClick).toBeTruthy(); // verify the handler is wired up

    await act(async () => {
      reactOnClick({ preventDefault: () => {}, stopPropagation: () => {} });
    });

    // after click, sidebar should be closed
    expect(context.openMobile).toBe(false);

    unmount();
  });

  it.skip("shows admin/owner guilds in the admin section", async () => {
    const { container, unmount } = render(
      <SidebarProvider>
        <AppSidebar />
      </SidebarProvider>,
    );

    const ownerLink = container.querySelector(
      "a[href='/guildStats?guildId=111']",
    );
    const adminLink = container.querySelector(
      "a[href='/guildStats?guildId=222']",
    );
    const memberLink = container.querySelector(
      "a[href='/guildStats?guildId=333']",
    );

    expect(ownerLink).toBeTruthy();
    expect(ownerLink?.textContent).toContain("Owner Server");
    expect(adminLink).toBeTruthy();
    expect(adminLink?.textContent).toContain("Admin Server");
    expect(memberLink).toBeFalsy();

    unmount();
  });

  it("isAdminOrOwnerGuild helper returns expected values", () => {
    expect(isAdminOrOwnerGuild({ owner: true })).toBe(true);
    expect(isAdminOrOwnerGuild({ permissions: "8" })).toBe(true);
    expect(isAdminOrOwnerGuild({ permissions: "0" })).toBe(false);
    expect(isAdminOrOwnerGuild({ permissions: "2" })).toBe(false);
    expect(isAdminOrOwnerGuild({})).toBe(false);
  });
});
