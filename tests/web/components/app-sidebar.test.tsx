// @vitest-environment happy-dom
/// <reference lib="dom" />

// Required for React's act() to work outside of a full testing-library setup
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createElement, useEffect, act } from "react";
import { createRoot } from "react-dom/client";

import { AppSidebar } from "../../../apps/web/components/app-sidebar.js";
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

  function ContextReader() {
    const ctx = useSidebar();
    useEffect(() => {
      context = ctx;
    }, [ctx]);
    return null;
  }

  beforeEach(() => {
    context = null;
  });

  it("closes mobile sidebar when a link is clicked", async () => {
    const { container, unmount } = render(
      <SidebarProvider>
        <AppSidebar />
        <ContextReader />
      </SidebarProvider>,
    );

    // ensure we have context and we can open mobile
    expect(context).not.toBeNull();

    await act(async () => {
      context.setOpenMobile(true);
    });
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
});
