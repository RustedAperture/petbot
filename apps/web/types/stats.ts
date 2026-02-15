export type ActionTotals = {
  totalHasPerformed: number;
  totalUsers: number;
  imageUrl: string;
};

export type GlobalStats = {
  totalsByAction: Record<string, ActionTotals>;
  totalActionsPerformed: number;
  totalUniqueUsers: number;
  totalLocations: number;
  totalGuilds?: number;
};
