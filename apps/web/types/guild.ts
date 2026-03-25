export interface GuildSettings {
  logChannel: string;
  nickname: string;
  sleepImage: string;
  defaultImages: DefaultImages;
  restricted: boolean;
  updatedAt: string;
}

export interface DefaultImages {
  pet: string;
  bite: string;
  hug: string;
  squish: string;
  bonk: string;
  explode: string;
}
