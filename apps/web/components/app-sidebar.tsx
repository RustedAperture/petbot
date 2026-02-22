"use client";

import Link from "next/link";
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
import { STATS_MENU } from "@/types/menu-config";
import { useSession } from "@/hooks/use-session";
import { AppUser } from "@/components/app-user";
import { BotMessageSquare, LogIn } from "lucide-react";
import { Separator } from "./ui/separator";
import { memo, useEffect, useState } from "react";
import { ThemeToggle } from "./ui/theme-toggle";
import { ChangelogDialog } from "@/components/changelog-dialog";

export function AppSidebar({
  version,
  ...props
}: { version?: string } & React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();

  const activeClass =
    "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground min-w-8 duration-200 ease-linear";

  const matchPath = (href: string) => {
    if (!href) {
      return false;
    }
    if (href === "/") {
      return pathname === "/";
    }
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Link
                href="/"
                aria-label="PetBot"
                className="flex items-center gap-2 group-data-[collapsible=icon]:mx-auto"
              >
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-amber-200 text-stone-900">
                  <BotMessageSquare />
                </div>
                <span className="group-data-[collapsible=icon]:hidden text-xl">
                  PetBot
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
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
                    <Link href={item.href}>
                      <item.Icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              {version ? (
                <SidebarMenuItem>
                  <ChangelogDialog version={version} />
                </SidebarMenuItem>
              ) : null}

              <ThemeToggle />
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
const SessionAccountInner = () => {
  const [mounted, setMounted] = useState(false);
  const { session, loading, signIn, signOut } = useSession();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // Render a consistent placeholder until the client has mounted to avoid
  // server/client HTML mismatches (hydration errors).
  if (!mounted) {
    return <div className="text-sm text-muted-foreground" />;
  }

  // If we already have a session, render it immediately so a background
  // `refresh()` doesn't replace the UI with a transient loading state.
  if (session) {
    const userProp = {
      name: session.user.username,
      email: undefined as string | undefined,
      avatar: session.user.avatarUrl ?? session.user.avatar ?? undefined,
    };
    return <AppUser user={userProp} onSignOut={signOut} />;
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size="lg"
          className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground group-data-[collapsible=icon]:justify-center"
          onClick={signIn}
        >
          <span className="group-data-[collapsible=icon]:hidden">
            Sign in with Discord
          </span>
          <LogIn className="ml-auto group-data-[collapsible=icon]:ml-0" />
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
};

export const SessionAccount = memo(SessionAccountInner);
