// @vitest-environment happy-dom
/// <reference lib="dom" />
import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, createElement, type ReactNode } from "react";
import { createRoot } from "react-dom/client";

const { push, setOpenMobile } = vi.hoisted(() => ({
  push: vi.fn(),
  setOpenMobile: vi.fn(),
}));

let isOwner = false;
let isMobile = false;

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/",
}));
vi.mock("@/hooks/use-is-owner", () => ({
  useIsOwner: () => ({ isOwner, isLoading: false }),
}));
vi.mock("@/hooks/use-session", () => ({ useSession: () => ({ session: null }) }));
vi.mock("@/hooks/use-delete-user-data", () => ({
  useDeleteUserData: () => ({ deleteUserData: vi.fn() }),
}));
vi.mock("@/hooks/use-delete-user-sessions", () => ({
  useDeleteUserSessions: () => ({ deleteUserSessions: vi.fn() }),
}));
vi.mock("@/components/dialogs/user-settings-dialog", () => ({
  UserSettingsDialog: () => null,
}));
vi.mock("@/components/ui/sidebar", () => ({
  SidebarMenu: ({ children }: { children: ReactNode }) => children,
  SidebarMenuItem: ({ children }: { children: ReactNode }) => children,
  SidebarMenuButton: ({ children }: { children: ReactNode }) => children,
  useSidebar: () => ({ isMobile, setOpenMobile }),
}));
// Menu contents render inline so items can be asserted without opening the popup.
vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => children,
  DropdownMenuTrigger: () => null,
  DropdownMenuContent: ({ children }: { children: ReactNode }) => children,
  DropdownMenuSeparator: () => null,
  DropdownMenuItem: ({ children, onClick }: { children: ReactNode; onClick?: () => void }) =>
    createElement("button", { type: "button", onClick }, children),
}));

import { AppUser } from "@/components/app-user";

function render() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(createElement(AppUser, { user: { name: "walnut" } }));
  });
  return {
    container,
    unmount: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
}

function menuLabels(container: HTMLElement) {
  return Array.from(container.querySelectorAll("button")).map((b) => b.textContent);
}

describe("AppUser menu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isOwner = false;
    isMobile = false;
  });

  it.each([
    [true, ["Settings", "Owner", "Log out"]],
    [false, ["Settings", "Log out"]],
  ])("with isOwner %s the menu items are %j", (value, labels) => {
    isOwner = value;
    const { container, unmount } = render();
    expect(menuLabels(container)).toEqual(labels);
    unmount();
  });

  it("opens the owner page and closes the mobile sidebar", () => {
    isOwner = true;
    isMobile = true;
    const { container, unmount } = render();
    const owner = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent === "Owner",
    )!;
    act(() => owner.click());
    expect(push).toHaveBeenCalledWith("/owner");
    expect(setOpenMobile).toHaveBeenCalledWith(false);
    unmount();
  });
});
