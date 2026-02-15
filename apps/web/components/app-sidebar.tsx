"use client";

import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import ThemeToggle from "@/components/ui/theme-toggle";
import { STATS_MENU } from "@/types/menu-config";
import { useSession } from "@/hooks/use-session";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();

  const activeClass =
    "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground min-w-8 duration-200 ease-linear";

  const matchPath = (href: string) => {
    if (!href) return false;
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="/">
                <span className="text-base font-semibold">PetBot</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel>Stats</SidebarGroupLabel>
          <SidebarMenu>
            {STATS_MENU.map((item) => {
              const active = matchPath(item.href);
              return (
                <SidebarMenuItem
                  key={item.id}
                  className="flex items-center gap-2"
                >
                  <SidebarMenuButton
                    asChild
                    tooltip={item.title}
                    className={active ? activeClass : undefined}
                  >
                    <a href={item.href}>
                      <item.Icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
        <SidebarGroup />
      </SidebarContent>
      <SidebarFooter>
        <div className="flex flex-col gap-2 px-2">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">Theme</div>
            <ThemeToggle />
          </div>

          {/* Account / Discord OAuth area */}
          <div className="mt-2 border-t pt-2">
            <AccountArea />
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

// small client-only account area placed in the sidebar footer
function AccountArea() {
  const { session, loading, signIn, signOut } = useSession();

  if (loading)
    return <div className="text-sm text-muted-foreground">Loading…</div>;

  if (!session)
    return (
      <div className="flex gap-2 items-center">
        <button onClick={signIn} className="btn btn-ghost text-sm">
          Sign in with Discord
        </button>
      </div>
    );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-muted" />
          <div className="text-sm">{session.user.username}</div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={signOut}
            className="text-xs text-destructive underline"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
