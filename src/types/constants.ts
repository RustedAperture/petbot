export const ACTIONS = {
  pet: {
    past: "pet",
    noun: "pet",
    defaultImage:
      "https://github.com/RustedAperture/Stickers/blob/main/Belly%20Rub%202.0/belly%20rub-base.png?raw=true",
    guildSettingField: "default_pet_image" as const,
    imageSource: "target" as const,
  },
  bite: {
    past: "bitten",
    noun: "bite",
    defaultImage: "https://cloud.wfox.app/s/E9sXZLSAGw28M3K/preview",
    guildSettingField: "default_bite_image" as const,
    imageSource: "author" as const,
  },
} as const;

export type ActionType = keyof typeof ACTIONS;
export type ActionConfig = (typeof ACTIONS)[ActionType];
