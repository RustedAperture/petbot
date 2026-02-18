export interface GuildData {
  id: number;
  guildId: string;
  defaultImages?: Record<string, string> | null;
  logChannel: string;
  nickname: string;
  sleepImage: string;
  createdAt: string;
  updatedAt: string;
}
