export type ActionTotals = {
  totalHasPerformed: number;
  totalHasReceived?: number;
  totalUsers: number;
  imageUrl: string | null;
  images?: string[];
};

export type GlobalStats = {
  totalsByAction: Record<string, ActionTotals>;
  totalActionsPerformed: number;
  totalUniqueUsers: number;
  totalLocations: number;
  totalGuilds?: number;
};
