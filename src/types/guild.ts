interface GuildData {
  id: number;
  guild_id: string;
  default_images?: Record<string, string> | null;
  log_channel: string;
  nickname: string;
  sleep_image: string;
  createdAt: Date;
  updatedAt: Date;
}
