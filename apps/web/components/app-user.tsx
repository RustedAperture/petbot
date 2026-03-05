"use client";

import { useState } from "react";
import { useSession } from "@/hooks/use-session";
import { useDeleteUserData } from "@/hooks/use-delete-user-data";
import { useDeleteUserSessions } from "@/hooks/use-delete-user-sessions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { EllipsisVertical, LogOut, Settings } from "lucide-react";
import { Separator } from "./ui/separator";
import { UserSettingsDialog } from "./dialogs/user-settings-dialog";

export function AppUser({
  user,
  onSignOut,
}: {
  user: {
    name: string;
    email?: string | null;
    avatar?: string | null;
  };
  onSignOut?: () => void | Promise<void>;
}) {
  const { isMobile } = useSidebar();
  const [dialogOpen, setDialogOpen] = useState(false);
  const { session } = useSession();
  const { deleteUserData } = useDeleteUserData();
  const { deleteUserSessions } = useDeleteUserSessions();

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatar ?? undefined} alt={user.name} />
                  <AvatarFallback className="rounded-lg">CN</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                </div>
                <EllipsisVertical className="ml-auto size-4" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
              side={isMobile ? "bottom" : "right"}
              align="end"
              sideOffset={4}
            >
              <DropdownMenuItem onClick={() => setDialogOpen(true)}>
                <Settings />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() =>
                  void (onSignOut
                    ? onSignOut()
                    : window.location.assign("/api/auth/logout"))
                }
              >
                <LogOut />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <UserSettingsDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onDelete={async () => {
          const id = session?.user.id;
          if (!id) return;
          const dataOk = await deleteUserData(id);
          const sessionsOk = await deleteUserSessions(id);
          if (!dataOk || !sessionsOk) {
            throw new Error("Failed to delete account data. Please try again.");
          }
          window.location.assign("/api/auth/logout");
        }}
      />
    </>
  );
}
