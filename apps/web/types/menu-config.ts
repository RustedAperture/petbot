import { Earth, Users, User, MessageSquare } from "lucide-react";
import type { ComponentType, SVGProps } from "react";

export type MenuItem = {
  id: string;
  title: string;
  href: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
};

export const STATS_MENU: MenuItem[] = [
  { id: "global", title: "Global", href: "/globalStats", Icon: Earth },
  { id: "guild", title: "Guild", href: "/guildStats", Icon: Users },
  { id: "dm", title: "DM", href: "/dmStats", Icon: MessageSquare },
  { id: "user", title: "User", href: "/userStats", Icon: User },
];
