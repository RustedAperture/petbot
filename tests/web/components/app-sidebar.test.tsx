// @vitest-environment happy-dom
/// <reference lib="dom" />

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createElement, useEffect } from "react";
import { createRoot } from "react-dom/client";

import { AppSidebar } from "../../../apps/web/components/app-sidebar.js";
import {
  SidebarProvider,
  useSidebar,
} from "../../../apps/web/components/ui/sidebar.js";

// stub mobile hook so sidebar thinks it's on phone
vi.mock("../../../apps/web/hooks/use-mobile.js", () => ({
  useIsMobile: () => true,
}));

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
    context.setOpenMobile(true);
    expect(context.openMobile).toBe(true);

    // find a stats link (first in menu)
    const link = container.querySelector("a[href='/']");
    expect(link).toBeTruthy();

    // simulate click
    link?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    // after click, sidebar should be closed
    expect(context.openMobile).toBe(false);

    unmount();
  });
});
