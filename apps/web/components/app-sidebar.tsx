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
        <div className="flex items-center justify-between px-2">
          <div className="text-sm text-muted-foreground">Theme</div>
          <ThemeToggle />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
