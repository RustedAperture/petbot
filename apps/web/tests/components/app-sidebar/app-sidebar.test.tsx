// @vitest-environment happy-dom
/// <reference lib="dom" />

// Required for React's act() to work outside of a full testing-library setup
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

import { describe, it, expect, vi, beforeEach } from "vitest";
import { act } from "react";
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

type SidebarState = {
  isMobile: boolean;
  setOpenMobile: ReturnType<typeof vi.fn>;
  openMobile: boolean;
  open: boolean;
  toggleSidebar: ReturnType<typeof vi.fn>;
  setOpen: ReturnType<typeof vi.fn>;
};

let sidebarState: SidebarState;

// Mock @base-ui-backed UI components that crash due to the dual-React-instance
// problem: apps/web/node_modules/@base-ui uses its own React copy while
// react-dom uses the root copy.
vi.mock("@/components/ui/tooltip", () => {
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
vi.mock("@/components/ui/sheet", () => {
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
vi.mock("@/components/ui/sidebar", () => {
  const React = require("react");
  return {
    SidebarProvider: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    useSidebar: () => sidebarState,
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

vi.mock("@/components/ui/theme-toggle", () => ({
  ThemeToggle: () => null,
}));
vi.mock("@/components/app-user", () => ({
  AppUser: () => null,
}));

// DropdownMenu (ThemeToggle) and next-themes also use @base-ui/react/menu fastComponent
vi.mock("@/components/ui/dropdown-menu", () => {
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

const { AppSidebar } = await import("@/components/app-sidebar");
const { isAdminOrOwnerGuild } = await import("@/lib/utils");

vi.mock("@/hooks/use-session", () => ({
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
    // Render the provided React element directly to avoid introducing an
    // extra wrapper component which can cause hooks to be called outside
    // the component tree in certain test environments.
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

describe("AppSidebar mobile behaviour", () => {
  beforeEach(() => {
    sidebarState = {
      isMobile: true,
      setOpenMobile: vi.fn(),
      openMobile: false,
      open: false,
      toggleSidebar: vi.fn(),
      setOpen: vi.fn(),
    };
  });

  it("closes mobile sidebar when a link is clicked", async () => {
    const { container, unmount } = render(<AppSidebar />);

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

    // after click, sidebar should request mobile close
    expect(sidebarState.setOpenMobile).toHaveBeenCalledWith(false);

    unmount();
  });

  it("shows admin/owner guilds in the admin section", async () => {
    const { container, unmount } = render(<AppSidebar />);

    const ownerLink = container.querySelector("a[href='/admin/111']");
    const adminLink = container.querySelector("a[href='/admin/222']");
    const memberLink = container.querySelector("a[href='/admin/333']");

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
