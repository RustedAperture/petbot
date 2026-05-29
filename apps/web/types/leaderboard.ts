export interface LeaderboardEntry {
  rank: number;
  displayName: string | null;
  anonymousLabel: string;
  totalActions: number;
  isCurrentUser: boolean;
}
