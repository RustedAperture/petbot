export const ACTIONS = {
  pet: {
    past: "pet",
    noun: "pet",
    defaultImage:
      "https://github.com/RustedAperture/Stickers/blob/main/Belly%20Rub%202.0/belly%20rub-base.png?raw=true",
    imageSource: "target" as const,
  },
  bite: {
    past: "bitten",
    noun: "bite",
    defaultImage: "https://cloud.wfox.app/s/E9sXZLSAGw28M3K/preview",
    imageSource: "author" as const,
  },
  hug: {
    past: "hugged",
    noun: "hug",
    defaultImage:
      "https://github.com/RustedAperture/Stickers/blob/main/jello%20hug.gif?raw=true",
    imageSource: "author" as const,
  },
  bonk: {
    past: "bonked",
    noun: "bonk",
    defaultImage: "https://cloud.wfox.app/s/MMTz5MBwtPq3Qp8/preview",
    imageSource: "target" as const,
  },
  squish: {
    past: "squished",
    noun: "squish",
    defaultImage: "https://cloud.wfox.app/s/26NNfnfkpBnTKbi/preview",
    imageSource: "target" as const,
  },
} as const;

export type ActionType = keyof typeof ACTIONS;
export type ActionConfig = (typeof ACTIONS)[ActionType];
