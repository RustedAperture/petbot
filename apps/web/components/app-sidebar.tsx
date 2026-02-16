"use client";

import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import ThemeToggle from "@/components/ui/theme-toggle";
import { STATS_MENU } from "@/types/menu-config";
import { useSession } from "@/hooks/use-session";
import { AppUser } from "@/components/app-user";
import { Palette } from "lucide-react";
import { Separator } from "./ui/separator";

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
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem className="flex items-center gap-2">
                <SidebarMenuButton disabled>
                  <Palette />
                  Theme
                </SidebarMenuButton>
                <ThemeToggle />
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <Separator />
      <SidebarFooter>
        <SessionAccount />
      </SidebarFooter>
    </Sidebar>
  );
}

// small client-only wrapper that uses the shared AppUser component
function SessionAccount() {
  const { session, loading, signIn } = useSession();

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

  // AppUser expects { name, email?, avatar? }
  const userProp = {
    name: session.user.username,
    email: undefined as string | undefined,
    avatar: session.user.avatarUrl ?? session.user.avatar ?? undefined,
  };

  return <AppUser user={userProp} />;
}
