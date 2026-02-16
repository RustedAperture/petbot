import { Earth, Users, User, MessageSquare } from "lucide-react";
import type { ComponentType, SVGProps } from "react";

export type MenuItem = {
  id: string;
  title: string;
  href: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
};

export const STATS_MENU: MenuItem[] = [
  { id: "global", title: "Global Stats", href: "/globalStats", Icon: Earth },
  { id: "guild", title: "Guild Stats", href: "/guildStats", Icon: Users },
  { id: "dm", title: "DM Stats", href: "/dmStats", Icon: MessageSquare },
  { id: "user", title: "User Stats", href: "/userStats", Icon: User },
];
