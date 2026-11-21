export type CustomAction = {
  id: string;
  name: string;
  phrase: string;
  scope: "user" | "guild";
  ownerId: string;
  image: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type CustomActionInput = {
  name: string;
  phrase: string;
  image: string;
};

export type CustomActionsScope =
  | { kind: "user"; userId: string }
  | { kind: "guild"; guildId: string };

export const MAX_CUSTOM_ACTIONS = 5;
