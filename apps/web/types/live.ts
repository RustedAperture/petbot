export type LiveActionEvent = {
  id: number;
  actionType: string;
  createdAt: string;
  role?: "performed" | "received" | "both";
  phrase?: string;
};

export type LiveScope =
  | { kind: "global" }
  | { kind: "guild"; guildId: string }
  | { kind: "user"; userId: string }
  | { kind: "userLocation"; userId: string; locationId: string };

export type LiveCountMode = "location" | "user";
