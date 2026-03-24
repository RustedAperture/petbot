"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  History,
  BotMessageSquare,
  Handshake,
  LogIn,
  Shield,
} from "lucide-react";
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
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { STATS_MENU } from "@/types/menu-config";
import { useSession } from "@/hooks/use-session";
import { AppUser } from "@/components/app-user";
import { Separator } from "./ui/separator";
import { memo, useEffect, useMemo, useState } from "react";
import { ThemeToggle } from "./ui/theme-toggle";
import { isAdminOrOwnerGuild, getDiscordGuildIconUrl } from "@/lib/utils";

export function AppSidebar({
  version,
  ...props
}: { version?: string } & React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  const { session } = useSession();
  const adminGuilds = useMemo(
    () => (session?.guilds ?? []).filter(isAdminOrOwnerGuild),
    [session?.guilds],
  );

  const visibleStatsMenu = useMemo(() => {
    if (session) {
      return STATS_MENU;
    }
    return STATS_MENU.filter((item) => item.id === "global");
  }, [session]);

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
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              render={
                <Link
                  href="/"
                  aria-label="PetBot"
                  className="flex items-center gap-2 group-data-[collapsible=icon]:mx-auto"
                  onClick={() => isMobile && setOpenMobile(false)}
                >
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-amber-200 text-stone-900">
                    <BotMessageSquare />
                  </div>
                  <span className="group-data-[collapsible=icon]:hidden text-xl">
                    PetBot
                  </span>
                </Link>
              }
            />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Stats</SidebarGroupLabel>
          <SidebarMenu>
            {visibleStatsMenu.map((item) => {
              const active = matchPath(item.href);
              return (
                <SidebarMenuItem
                  key={item.id}
                  className="flex items-center gap-2"
                >
                  <SidebarMenuButton
                    tooltip={item.title}
                    className={active ? activeClass : undefined}
                    render={
                      <Link
                        href={item.href}
                        onClick={() => isMobile && setOpenMobile(false)}
                      >
                        <item.Icon />
                        <span>{item.title}</span>
                      </Link>
                    }
                  />
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
        <SidebarSeparator />
        {session && adminGuilds.length > 0 ? (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarMenu>
              {adminGuilds.map((guild) => {
                const iconUrl = getDiscordGuildIconUrl(guild.id, guild.icon);
                return (
                  <SidebarMenuItem key={guild.id}>
                    <SidebarMenuButton
                      tooltip={guild.name}
                      className={
                        matchPath(`/admin/${guild.id}`)
                          ? activeClass
                          : undefined
                      }
                      render={
                        <Link
                          href={`/admin/${guild.id}`}
                          onClick={() => isMobile && setOpenMobile(false)}
                        >
                          {iconUrl ? (
                            <img
                              src={iconUrl}
                              alt=""
                              className="rounded-full object-cover"
                              style={{
                                width: "calc(var(--spacing) * 4)",
                                height: "calc(var(--spacing) * 4)",
                              }}
                              loading="lazy"
                            />
                          ) : (
                            <div
                              className="flex items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground"
                              style={{
                                minWidth: "calc(var(--spacing) * 4)",
                                height: "calc(var(--spacing) * 4)",
                              }}
                            >
                              {guild.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span>{guild.name}</span>
                        </Link>
                      }
                    />
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        ) : null}
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Terms of service"
                  className={matchPath("/terms") ? activeClass : undefined}
                  render={
                    <Link href="/terms">
                      <span className="group-data-[collapsible=icon]:hidden">
                        Terms
                      </span>
                      <Handshake className="ml-auto" />
                    </Link>
                  }
                />
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Privacy policy"
                  className={matchPath("/privacy") ? activeClass : undefined}
                  render={
                    <Link href="/privacy">
                      <span className="group-data-[collapsible=icon]:hidden">
                        Privacy
                      </span>
                      <Shield className="ml-auto" />
                    </Link>
                  }
                />
              </SidebarMenuItem>

              {version ? (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    tooltip={"Version: v" + version}
                    className={
                      matchPath("/changelog") ? activeClass : undefined
                    }
                    render={
                      <Link href="/changelog">
                        <span className="group-data-[collapsible=icon]:hidden">
                          Version v{version}
                        </span>
                        <History className="ml-auto" />
                      </Link>
                    }
                  />
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
