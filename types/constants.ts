export const ACTIONS = {
  pet: {
    past: "pet",
    noun: "pet",
  },
  bite: {
    past: "bitten",
    noun: "bite",
  },
} as const;

export type ActionType = keyof typeof ACTIONS;
